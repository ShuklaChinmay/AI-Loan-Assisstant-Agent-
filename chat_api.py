"""
Tata Capital – Agentic AI Loan Assistant
Upgrades:
  • Real 4-digit OTP via Fast2SMS
  • DigiLocker OAuth 2.0 for PAN / Aadhaar verification
  • Polling endpoint so the chat resumes automatically after DigiLocker
"""

import os, uuid, random, requests as http
from fastapi import FastAPI, Request, Query
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
# ENV / CONFIG
# ──────────────────────────────────────────────
FAST2SMS_API_KEY        = os.getenv("FAST2SMS_API_KEY", "")          # fast2sms.com → Dev API
DIGILOCKER_CLIENT_ID    = os.getenv("DIGILOCKER_CLIENT_ID", "")
DIGILOCKER_CLIENT_SECRET= os.getenv("DIGILOCKER_CLIENT_SECRET", "")
BASE_URL                = os.getenv("BASE_URL", "http://localhost:8000")

# DigiLocker endpoints (sandbox → replace host with api.digitallocker.gov.in for prod)
DL_AUTH_URL   = "https://api.digitallocker.gov.in/public/oauth2/1/authorize"
DL_TOKEN_URL  = "https://api.digitallocker.gov.in/public/oauth2/1/token"
DL_ISSUED_URL = "https://api.digitallocker.gov.in/public/oauth2/1/files/issued"
DL_AADHAAR_XML= "https://api.digitallocker.gov.in/public/oauth2/1/xml/eaadhaar"
DL_PAN_URL    = "https://api.digitallocker.gov.in/public/oauth2/1/files/issued"   # filter by issuer

app = FastAPI(title="Tata Capital Agentic AI")
SESSIONS: dict = {}


# ──────────────────────────────────────────────
# MODELS
# ──────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    reply: str
    pdf_url: Optional[str] = None
    digilocker_url: Optional[str] = None   # frontend opens this in a popup
    digilocker_done: Optional[bool] = None  # True once callback completes


# ──────────────────────────────────────────────
# OTP HELPER – Fast2SMS
# ──────────────────────────────────────────────
def send_otp(mobile: str, otp: str) -> bool:
    """
    Send OTP via Fast2SMS Bulk API.
    Docs: https://www.fast2sms.com/docs
    Returns True on success, False on failure / missing key.
    """
    if not FAST2SMS_API_KEY:
        # Dev fallback: just print (remove in production)
        print(f"[DEV] OTP for {mobile}: {otp}")
        return True

    try:
        resp = http.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": FAST2SMS_API_KEY},
            data={
                "route": "otp",
                "variables_values": otp,
                "flash": 0,
                "numbers": mobile,
            },
            timeout=8,
        )
        return resp.json().get("return", False)
    except Exception as e:
        print(f"[OTP ERROR] {e}")
        return False


# ──────────────────────────────────────────────
# DIGILOCKER HELPERS
# ──────────────────────────────────────────────
def digilocker_auth_url(session_id: str) -> str:
    """Build the DigiLocker OAuth2 authorization URL."""
    redirect_uri = f"{BASE_URL}/digilocker/callback"
    params = (
        f"?response_type=code"
        f"&client_id={DIGILOCKER_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&state={session_id}"                  # round-trip the session id
        f"&scope=openid"                         # basic profile
    )
    return DL_AUTH_URL + params


def digilocker_fetch_docs(code: str) -> dict:
    """
    Exchange auth-code → access-token, then pull issued documents.
    Returns a dict with pan_number, aadhaar_masked, name (if available).
    """
    redirect_uri = f"{BASE_URL}/digilocker/callback"

    # 1) Token exchange
    token_resp = http.post(
        DL_TOKEN_URL,
        data={
            "code": code,
            "grant_type": "authorization_code",
            "client_id": DIGILOCKER_CLIENT_ID,
            "client_secret": DIGILOCKER_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
        },
        timeout=10,
    )
    token_data = token_resp.json()
    access_token = token_data.get("access_token", "")
    if not access_token:
        return {"error": "token_failed"}

    headers = {"Authorization": f"Bearer {access_token}"}

    # 2) Fetch issued documents list
    files_resp = http.get(DL_ISSUED_URL, headers=headers, timeout=10)
    files_data = files_resp.json()

    result = {"access_token": access_token, "raw_files": files_data}

    # 3) Try to extract PAN & Aadhaar from the items
    for item in files_data.get("items", []):
        doctype = item.get("doctype", "").upper()
        if "PAN" in doctype or item.get("issuer", "") == "INCOME TAX DEPARTMENT":
            result["pan_number"] = item.get("name", "")
            result["pan_docuri"]  = item.get("uri", "")
        if "AADHAAR" in doctype or "ADHAR" in doctype:
            result["aadhaar_masked"] = item.get("name", "")

    return result


# ──────────────────────────────────────────────
# DIGILOCKER CALLBACK ENDPOINT
# ──────────────────────────────────────────────
@app.get("/digilocker/callback")
def digilocker_callback(code: str = Query(...), state: str = Query(...)):
    """
    DigiLocker redirects here after user authorises.
    We fetch the docs, stash them in the session, then show a
    close-me page so the popup shuts and the parent page knows.
    """
    session_id = state
    s = SESSIONS.get(session_id)

    if not s:
        return HTMLResponse("<h3>Session expired. Please restart.</h3>", status_code=400)

    if not DIGILOCKER_CLIENT_ID:
        # Sandbox / demo mode – simulate a successful fetch
        docs = {
            "pan_number":      "ABCDE1234F",
            "aadhaar_masked":  "XXXX-XXXX-5678",
            "name":            "Demo User",
        }
    else:
        docs = digilocker_fetch_docs(code)

    if "error" in docs:
        s["digilocker_status"] = "failed"
        return HTMLResponse("""
            <script>
              window.opener && window.opener.postMessage('dl_failed','*');
              window.close();
            </script>
            <p>Verification failed. Please close this window and try again.</p>
        """)

    s["digilocker_docs"]   = docs
    s["digilocker_status"] = "done"
    s["stage"]             = "EMPLOYMENT"   # advance the chat stage

    pan = docs.get("pan_number", "N/A")
    aadh = docs.get("aadhaar_masked", "N/A")

    return HTMLResponse(f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body{{font-family:Segoe UI,sans-serif;display:flex;flex-direction:column;
              align-items:center;justify-content:center;height:100vh;
              background:#f0fdf4;color:#166534;margin:0}}
        .tick{{font-size:60px}}
        h2{{margin:12px 0 4px}}
        p{{opacity:.7;margin:0}}
      </style>
    </head>
    <body>
      <div class="tick">✅</div>
      <h2>Documents Verified!</h2>
      <p>PAN: {pan}</p>
      <p>Aadhaar: {aadh}</p>
      <p style="margin-top:16px;font-size:13px">You can close this window.</p>
      <script>
        // Tell the parent chat window that DigiLocker is done
        if(window.opener) window.opener.postMessage('dl_done','*');
        setTimeout(()=>window.close(), 2000);
      </script>
    </body>
    </html>
    """)


# ──────────────────────────────────────────────
# POLL ENDPOINT (frontend checks after DigiLocker popup)
# ──────────────────────────────────────────────
@app.get("/digilocker/status/{session_id}")
def digilocker_status(session_id: str):
    s = SESSIONS.get(session_id, {})
    status = s.get("digilocker_status", "pending")
    docs   = s.get("digilocker_docs", {})
    return JSONResponse({"status": status, "docs": docs})


# ──────────────────────────────────────────────
# UNDERWRITING AGENT
# ──────────────────────────────────────────────
class UnderwritingAgent:
    def run(self, d: dict) -> dict:
        if d["credit_score"] < 700:
            return {"status": "REJECTED", "reason": "Credit score below 700"}

        emi = d["loan_amount"] / 36
        if emi + d["existing_emi"] > 0.5 * d["monthly_salary"]:
            return {"status": "REJECTED", "reason": "EMI exceeds 50 % of salary (affordability check)"}

        risk = "LOW" if d["credit_score"] >= 750 else "MEDIUM"
        return {"status": "APPROVED", "risk": risk}


# ──────────────────────────────────────────────
# SANCTION LETTER PDF
# ──────────────────────────────────────────────
def generate_pdf(session: dict, risk: str) -> str:
    os.makedirs("sanctions", exist_ok=True)
    name = f"sanction_{uuid.uuid4().hex}.pdf"
    path = f"sanctions/{name}"

    docs   = session.get("digilocker_docs", {})
    pan    = docs.get("pan_number",     session.get("pan_last4", "N/A"))
    aadh   = docs.get("aadhaar_masked", "N/A")
    amount = session["amount"]

    c = canvas.Canvas(path, pagesize=A4)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, 790, "TATA CAPITAL LIMITED")
    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, 760, "PERSONAL LOAN – SANCTION LETTER")
    c.setFont("Helvetica", 11)
    c.drawString(50, 730, f"Mobile          : {session.get('mobile', 'N/A')}")
    c.drawString(50, 712, f"PAN             : {pan}")
    c.drawString(50, 694, f"Aadhaar         : {aadh}")
    c.drawString(50, 676, f"Employment      : {session.get('employment', 'N/A').title()}")
    c.drawString(50, 658, f"Organization    : {session.get('organization', 'N/A')}")
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, 630, f"Approved Amount : ₹{amount:,}")
    c.setFont("Helvetica", 11)
    c.drawString(50, 612, f"Interest Rate   : 11.5 % p.a. (reducing)")
    c.drawString(50, 594, f"Tenure          : 36 months")
    c.drawString(50, 576, f"Estimated EMI   : ₹{int(amount/36):,}")
    c.drawString(50, 558, f"Risk Category   : {risk}")
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 510, "This is a system-generated sanction letter – Tata Capital Agentic AI.")
    c.showPage()
    c.save()
    return name


# ──────────────────────────────────────────────
# MAIN CHAT ENDPOINT
# ──────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):

    # ── New session ──────────────────────────────
    if req.session_id not in SESSIONS:
        SESSIONS[req.session_id] = {"stage": "MOBILE"}
        return ChatResponse(
            reply=(
                "👋 Hi! Welcome to **Tata Capital's AI-Powered Personal Loan Assistant**.\n\n"
                "Let's begin with a quick identity verification.\n\n"
                "📱 Please enter your **10-digit mobile number**."
            )
        )

    s   = SESSIONS[req.session_id]
    msg = req.message.strip()
    low = msg.lower()

    def to_int(v):
        try: return int(v.replace(",", ""))
        except: return None

    # ── MOBILE ──────────────────────────────────
    if s["stage"] == "MOBILE":
        if not msg.isdigit() or len(msg) != 10:
            return ChatResponse(reply="❗ Please enter a valid **10-digit mobile number**.")
        s["mobile"] = msg
        otp = str(random.randint(1000, 9999))
        s["otp"] = otp
        ok = send_otp(msg, otp)
        s["stage"] = "OTP"
        if ok:
            return ChatResponse(
                reply="📩 OTP sent to your mobile number.\nPlease enter the **4-digit OTP** to continue."
            )
        else:
            return ChatResponse(
                reply=(
                    "⚠️ Could not dispatch SMS right now "
                    f"(check FAST2SMS_API_KEY).\n"
                    f"For testing, use OTP: **{otp}**"
                )
            )

    # ── OTP ─────────────────────────────────────
    if s["stage"] == "OTP":
        if msg != s["otp"]:
            return ChatResponse(reply="❌ Incorrect OTP. Please try again.")
        s["stage"] = "DIGILOCKER"
        dl_url = digilocker_auth_url(req.session_id) if DIGILOCKER_CLIENT_ID else None
        return ChatResponse(
            reply=(
                "✅ Mobile number verified!\n\n"
                "🔐 Next, we'll verify your identity via **DigiLocker**.\n"
                "Click the button below to securely share your PAN & Aadhaar.\n\n"
                "*(A small popup window will open – please allow popups for this site.)*"
                if dl_url else
                "✅ Mobile number verified!\n\n"
                "🔐 **DigiLocker** credentials not configured – running in demo mode.\n"
                "Documents will be auto-verified for this session.\n\n"
                "Type **CONTINUE** to proceed."
            ),
            digilocker_url=dl_url,
        )

    # ── DIGILOCKER (demo / skip path) ───────────
    if s["stage"] == "DIGILOCKER":
        # This stage is reached only in demo mode (no client_id)
        if low == "continue" or not DIGILOCKER_CLIENT_ID:
            s["digilocker_docs"] = {
                "pan_number":     "DEMO01234F",
                "aadhaar_masked": "XXXX-XXXX-0000",
            }
            s["digilocker_status"] = "done"
            s["stage"] = "EMPLOYMENT"
            return ChatResponse(
                reply=(
                    "✅ Documents verified (demo mode).\n\n"
                    "💼 Please select your **employment type**:\n\n"
                    "Type **SALARIED** or **SELF-EMPLOYED**"
                )
            )
        return ChatResponse(reply="Please complete the DigiLocker verification or type **CONTINUE**.")

    # ── EMPLOYMENT ──────────────────────────────
    if s["stage"] == "EMPLOYMENT":
        if low not in ["salaried", "self-employed", "self employed"]:
            return ChatResponse(reply="Please type **SALARIED** or **SELF-EMPLOYED**.")
        s["employment"] = low
        s["stage"] = "ORG"
        return ChatResponse(reply="🏢 Please enter your **company / business name**.")

    # ── ORGANIZATION ────────────────────────────
    if s["stage"] == "ORG":
        s["organization"] = msg.title()
        s["stage"] = "SALARY"
        return ChatResponse(reply="Thanks 👍  Now enter your **monthly take-home salary (₹)**.")

    # ── SALARY ──────────────────────────────────
    if s["stage"] == "SALARY":
        v = to_int(msg)
        if v is None:
            return ChatResponse(reply="Please enter salary as a number (₹).")
        s["salary"] = v
        s["stage"] = "CREDIT"
        return ChatResponse(reply="What is your **CIBIL / credit score**?")

    # ── CREDIT SCORE ────────────────────────────
    if s["stage"] == "CREDIT":
        v = to_int(msg)
        if v is None or not (300 <= v <= 900):
            return ChatResponse(reply="Please enter a valid credit score between **300 – 900**.")
        s["credit"] = v
        s["stage"] = "AMOUNT"
        return ChatResponse(reply="How much **loan amount (₹)** do you need?")

    # ── LOAN AMOUNT ─────────────────────────────
    if s["stage"] == "AMOUNT":
        v = to_int(msg)
        if v is None or v < 50000:
            return ChatResponse(reply="Minimum loan amount is ₹50,000. Please enter a valid amount.")
        s["amount"] = v
        s["stage"] = "EMI"
        return ChatResponse(reply="Do you have any **existing monthly EMI obligations**? Enter amount or **0**.")

    # ── EXISTING EMI ────────────────────────────
    if s["stage"] == "EMI":
        v = to_int(msg)
        if v is None:
            return ChatResponse(reply="Please enter the EMI amount in numbers (or 0).")
        s["emi"] = v
        s["stage"] = "CONFIRM"

        docs = s.get("digilocker_docs", {})
        pan  = docs.get("pan_number",     "Verified ✅")
        aadh = docs.get("aadhaar_masked", "Verified ✅")

        return ChatResponse(
            reply=(
                "🔍 **Please confirm your details:**\n\n"
                f"• Mobile        : {s['mobile']}\n"
                f"• PAN           : {pan}\n"
                f"• Aadhaar       : {aadh}\n"
                f"• Employment    : {s['employment'].title()}\n"
                f"• Organization  : {s['organization']}\n"
                f"• Salary        : ₹{s['salary']:,}\n"
                f"• Credit Score  : {s['credit']}\n"
                f"• Loan Amount   : ₹{s['amount']:,}\n"
                f"• Existing EMI  : ₹{s['emi']:,}\n\n"
                "Type **YES** to submit or **NO** to restart."
            )
        )

    # ── CONFIRM ─────────────────────────────────
    if s["stage"] == "CONFIRM":
        if low == "yes":
            s["stage"] = "PROCESSING"
            s["result"] = UnderwritingAgent().run({
                "credit_score":  s["credit"],
                "loan_amount":   s["amount"],
                "monthly_salary":s["salary"],
                "existing_emi":  s["emi"],
            })
            return ChatResponse(reply="PROCESSING")

        if low == "no":
            keep = {k: s[k] for k in ("mobile", "digilocker_docs", "digilocker_status") if k in s}
            s.clear()
            s.update(keep)
            s["stage"] = "EMPLOYMENT"
            return ChatResponse(
                reply="No worries 😊  Let's redo the financial details.\n\n"
                      "💼 **Employment type** — type SALARIED or SELF-EMPLOYED."
            )

        return ChatResponse(reply="Please reply with **YES** or **NO**.")

    # ── PROCESSING ──────────────────────────────
    if s["stage"] == "PROCESSING":
        r = s["result"]
        s["stage"] = "DONE"

        if r["status"] == "REJECTED":
            return ChatResponse(
                reply=f"❌ **Loan Application Rejected**\n\nReason: {r['reason']}\n\n"
                      "You may re-apply after 90 days or improve your credit profile."
            )

        pdf = generate_pdf(s, r["risk"])
        return ChatResponse(
            reply=(
                "🎉 **Congratulations! Your loan has been approved.**\n\n"
                f"• Approved Amount : ₹{s['amount']:,}\n"
                f"• Interest Rate   : 11.5 % p.a.\n"
                f"• Tenure          : 36 months\n"
                f"• Estimated EMI   : ₹{int(s['amount']/36):,}\n"
                f"• Risk Category   : {r['risk']}\n\n"
                "📄 Your sanction letter is ready for download."
            ),
            pdf_url=f"/sanctions/{pdf}",
        )

    # ── DONE ────────────────────────────────────
    return ChatResponse(reply="🙏 Thank you for choosing **Tata Capital**! 💙")


# ──────────────────────────────────────────────
# STATIC ROUTES
# ──────────────────────────────────────────────
@app.get("/sanctions/{file}")
def download(file: str):
    return FileResponse(f"sanctions/{file}", media_type="application/pdf")


# ──────────────────────────────────────────────
# WEB UI
# ──────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def root():
    return r"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tata Capital – AI Loan Assistant</title>
<style>
:root{
  --bg:#eef3f8;--chat:#fff;--bot:#e6ecff;--user:#1a4db3;
  --text:#111;--sub:#555;--border:#d4dbe8;
}
.dark{
  --bg:#0f172a;--chat:#020617;--bot:#1e293b;--user:#2563eb;
  --text:#f1f5f9;--sub:#94a3b8;--border:#334155;
}

*{box-sizing:border-box;margin:0;padding:0}
body{
  background:var(--bg);font-family:'Segoe UI',system-ui,sans-serif;
  color:var(--text);min-height:100vh;display:flex;
  align-items:center;justify-content:center;
}

/* ── SPLASH ──────────────────────────────── */
#splash{
  position:fixed;inset:0;
  background:linear-gradient(135deg,#0b2e8a,#1a4db3,#1d6fcf);
  color:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;z-index:50;
  animation:splashOut .7s ease forwards;animation-delay:2.6s;
}
#splash img{width:60px;margin-bottom:18px;filter:brightness(0) invert(1)}
#splash h1{font-size:32px;letter-spacing:.5px}
#splash p{margin-top:6px;opacity:.8;font-size:15px}
@keyframes splashOut{to{opacity:0;pointer-events:none;visibility:hidden}}

/* ── CHAT SHELL ───────────────────────────── */
.shell{
  width:440px;max-width:98vw;
  background:var(--chat);
  border-radius:20px;
  box-shadow:0 20px 60px rgba(0,0,0,.22);
  display:flex;flex-direction:column;
  height:660px;overflow:hidden;
  border:1px solid var(--border);
}

/* ── HEADER ─────────────────────────────── */
.hdr{
  background:linear-gradient(120deg,#0b2e8a,#1a4db3);
  color:#fff;padding:14px 18px;
  display:flex;align-items:center;gap:12px;
  border-radius:20px 20px 0 0;
}
.hdr .avatar{
  width:38px;height:38px;border-radius:50%;
  background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;font-size:18px;
  flex-shrink:0;
}
.hdr .info{flex:1}
.hdr .name{font-weight:700;font-size:15px}
.hdr .status{font-size:11px;opacity:.75;margin-top:2px}
.hdr .toggle{cursor:pointer;font-size:17px;padding:4px 8px;
  border-radius:8px;background:rgba(255,255,255,.15)}

/* ── MESSAGES ───────────────────────────── */
.msgs{
  flex:1;overflow-y:auto;padding:16px;
  background:var(--bg);display:flex;flex-direction:column;gap:10px;
  scroll-behavior:smooth;
}
.msgs::-webkit-scrollbar{width:4px}
.msgs::-webkit-scrollbar-thumb{background:#c0c9d8;border-radius:4px}

.bub{
  max-width:78%;padding:11px 15px;border-radius:16px;
  font-size:14px;line-height:1.55;
  animation:pop .22s ease;
}
@keyframes pop{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

.bub.bot{background:var(--bot);border-bottom-left-radius:4px}
.bub.user{
  background:var(--user);color:#fff;
  margin-left:auto;border-bottom-right-radius:4px;
}

/* ── TYPING ─────────────────────────────── */
.typing{display:flex;gap:4px;padding:8px 4px}
.typing span{
  width:7px;height:7px;background:var(--user);
  border-radius:50%;animation:blink 1.3s infinite;
}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,100%{opacity:.25}50%{opacity:1}}

/* ── DIGILOCKER BANNER ──────────────────── */
.dl-banner{
  background:linear-gradient(120deg,#1e40af,#1d6fcf);
  color:#fff;border-radius:12px;padding:14px 16px;
  margin:2px 0;font-size:13.5px;line-height:1.5;
}
.dl-banner b{font-size:14.5px}
.dl-btn{
  display:inline-block;margin-top:10px;
  background:#fff;color:#1a4db3;font-weight:700;
  padding:9px 20px;border-radius:8px;cursor:pointer;
  border:none;font-size:13px;transition:opacity .2s;
}
.dl-btn:hover{opacity:.85}

/* ── INPUT BAR ──────────────────────────── */
.bar{
  padding:12px 14px;border-top:1px solid var(--border);
  display:flex;gap:8px;background:var(--chat);
}
.bar input{
  flex:1;padding:10px 14px;border:1.5px solid var(--border);
  border-radius:10px;font-size:14px;background:var(--bg);
  color:var(--text);outline:none;
  transition:border-color .2s;
}
.bar input:focus{border-color:var(--user)}
.bar button{
  background:var(--user);color:#fff;border:none;
  padding:0 20px;border-radius:10px;font-size:14px;
  font-weight:600;cursor:pointer;transition:opacity .2s;
}
.bar button:hover{opacity:.88}

/* ── RESULT OVERLAY ─────────────────────── */
#overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.65);
  display:none;flex-direction:column;
  align-items:center;justify-content:center;
  color:#fff;z-index:40;gap:12px;
}
.badge{
  width:90px;height:90px;border-radius:50%;
  border:5px solid #22c55e;
  display:flex;align-items:center;justify-content:center;
  font-size:46px;
  animation:pop .35s ease;
}
.badge.reject{border-color:#ef4444}
#overlay p{font-size:18px;font-weight:600}
</style>
</head>
<body>

<!-- SPLASH -->
<div id="splash">
  <div style="font-size:52px;margin-bottom:12px">🏦</div>
  <h1>Tata Capital</h1>
  <p>AI-Powered Personal Loan Assistant</p>
</div>

<!-- RESULT OVERLAY -->
<div id="overlay">
  <div id="badge" class="badge">✔</div>
  <p id="ot"></p>
</div>

<!-- CHAT -->
<div class="shell">
  <div class="hdr">
    <div class="avatar">🤖</div>
    <div class="info">
      <div class="name">Tata Capital AI</div>
      <div class="status">● Online – Loan Assistant</div>
    </div>
    <span class="toggle" onclick="toggleDark()" title="Toggle dark mode">🌙</span>
  </div>
  <div class="msgs" id="msgs"></div>
  <div class="bar">
    <input id="inp" placeholder="Type your message…" onkeydown="if(event.key==='Enter')send()"/>
    <button onclick="send()">Send</button>
  </div>
</div>

<script>
/* ──────────────────────────────────────────
   STATE
────────────────────────────────────────── */
let sid = crypto.randomUUID();
let dark = false;
let awaitingDigilocker = false;
let dlPollTimer = null;

const msgs = document.getElementById('msgs');
const inp  = document.getElementById('inp');

/* ──────────────────────────────────────────
   RENDER HELPERS
────────────────────────────────────────── */
function md(t){
  // Minimal markdown: **bold**, newlines
  return t
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
}

function addMsg(cls, html){
  const d = document.createElement('div');
  d.className = 'bub ' + cls;
  d.innerHTML = html;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

function showTyping(){
  const d = document.createElement('div');
  d.className = 'bub bot';
  d.id = 'typing';
  d.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}
function stopTyping(){ const t=document.getElementById('typing'); if(t)t.remove(); }

/* ──────────────────────────────────────────
   DIGILOCKER BANNER
────────────────────────────────────────── */
function showDigilockerBanner(url){
  awaitingDigilocker = true;
  inp.disabled = true;

  const d = document.createElement('div');
  d.className = 'bub bot';
  d.id = 'dl-card';
  d.innerHTML = `
    <div class="dl-banner">
      <b>🔐 DigiLocker Verification</b><br><br>
      Click below to securely connect your DigiLocker account.
      Your PAN & Aadhaar will be fetched automatically.<br><br>
      <button class="dl-btn" onclick="openDigilocker('${url}')">
        🔗 Open DigiLocker
      </button>
    </div>`;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function openDigilocker(url){
  const popup = window.open(url,'_blank','width=560,height=680,left=200,top=100');

  // Listen for postMessage from the callback page
  window.addEventListener('message', function onMsg(e){
    if(e.data === 'dl_done'){
      window.removeEventListener('message', onMsg);
      onDigilockerDone(true);
    } else if(e.data === 'dl_failed'){
      window.removeEventListener('message', onMsg);
      onDigilockerDone(false);
    }
  });

  // Fallback: poll every 2 s in case postMessage is blocked (cross-origin)
  dlPollTimer = setInterval(async ()=>{
    const r = await fetch(`/digilocker/status/${sid}`);
    const j = await r.json();
    if(j.status === 'done'){
      clearInterval(dlPollTimer);
      window.removeEventListener('message', ()=>{});
      onDigilockerDone(true);
    } else if(j.status === 'failed'){
      clearInterval(dlPollTimer);
      onDigilockerDone(false);
    }
  }, 2000);
}

async function onDigilockerDone(success){
  clearInterval(dlPollTimer);
  awaitingDigilocker = false;
  inp.disabled = false;

  const card = document.getElementById('dl-card');
  if(card) card.remove();

  if(!success){
    addMsg('bot','❌ DigiLocker verification failed. Please try again or contact support.');
    return;
  }

  // Fetch the verified docs info
  const r = await fetch(`/digilocker/status/${sid}`);
  const j = await r.json();
  const pan  = j.docs?.pan_number     || 'Verified';
  const aadh = j.docs?.aadhaar_masked || 'Verified';

  addMsg('bot',
    `✅ <strong>DigiLocker verified!</strong><br>` +
    `PAN: <strong>${pan}</strong> &nbsp;|&nbsp; Aadhaar: <strong>${aadh}</strong>`
  );

  // Now advance: ask employment
  setTimeout(()=>{
    addMsg('bot','💼 Please select your <strong>employment type</strong>:<br><br>Type <strong>SALARIED</strong> or <strong>SELF-EMPLOYED</strong>');
  }, 600);
}

/* ──────────────────────────────────────────
   SEND MESSAGE
────────────────────────────────────────── */
async function send(){
  if(awaitingDigilocker) return;
  const text = inp.value.trim();
  if(!text) return;
  addMsg('user', text);
  inp.value = '';
  showTyping();

  const res = await fetch('/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({session_id:sid, message:text})
  });
  const data = await res.json();
  stopTyping();

  /* ── PROCESSING (2-stage) ── */
  if(data.reply === 'PROCESSING'){
    showTyping();
    await new Promise(r=>setTimeout(r,2200));
    const res2 = await fetch('/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({session_id:sid, message:'ok'})
    });
    const d2 = await res2.json();
    stopTyping();
    const approved = !d2.reply.toLowerCase().includes('rejected');
    showOverlay(approved, approved ? 'Loan Approved 🎉' : 'Loan Rejected ❌');
    addMsg('bot', md(d2.reply));
    if(d2.pdf_url){
      addMsg('bot', `📄 <a href="${d2.pdf_url}" target="_blank"
        style="color:#1a4db3;font-weight:600">⬇️ Download Sanction Letter</a>`);
    }
    return;
  }

  /* ── DIGILOCKER TRIGGER ── */
  if(data.digilocker_url){
    addMsg('bot', md(data.reply));
    showDigilockerBanner(data.digilocker_url);
    return;
  }

  /* ── DEMO / NO CLIENT_ID PATH ── */
  if(data.digilocker_url === null && data.reply.includes('demo mode')){
    addMsg('bot', md(data.reply));
    return;
  }

  addMsg('bot', md(data.reply));
}

/* ──────────────────────────────────────────
   RESULT OVERLAY
────────────────────────────────────────── */
function showOverlay(ok, msg){
  const badge = document.getElementById('badge');
  badge.textContent = ok ? '✔' : '✖';
  badge.className   = ok ? 'badge' : 'badge reject';
  document.getElementById('ot').textContent = msg;
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  setTimeout(()=>{ ov.style.display='none'; }, 2800);
}

/* ──────────────────────────────────────────
   DARK MODE
────────────────────────────────────────── */
function toggleDark(){
  dark = !dark;
  document.body.className = dark ? 'dark' : '';
}

/* ──────────────────────────────────────────
   INIT
────────────────────────────────────────── */
window.addEventListener('load', async ()=>{
  await new Promise(r=>setTimeout(r,2800));
  showTyping();
  await new Promise(r=>setTimeout(r,900));
  stopTyping();
  const res = await fetch('/chat',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({session_id:sid, message:'Hi'})
  });
  const d = await res.json();
  addMsg('bot', md(d.reply));
});
</script>
</body>
</html>
"""
