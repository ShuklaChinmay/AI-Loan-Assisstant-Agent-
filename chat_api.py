from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional
import os, uuid
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

app = FastAPI(title="Tata Capital Agentic AI")

# ================= MODELS =================
class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    reply: str
    pdf_url: Optional[str] = None

SESSIONS = {}

# ================= UNDERWRITING AGENT =================
class UnderwritingAgent:
    def run(self, d):
        if d["credit_score"] < 700:
            return {"status": "REJECTED", "reason": "Credit score below 700"}

        emi = d["loan_amount"] / 36
        if emi + d["existing_emi"] > 0.5 * d["monthly_salary"]:
            return {"status": "REJECTED", "reason": "EMI exceeds affordability"}

        return {"status": "APPROVED", "risk": "LOW"}

# ================= SANCTION PDF =================
def generate_pdf(amount, risk):
    os.makedirs("sanctions", exist_ok=True)
    name = f"sanction_{uuid.uuid4().hex}.pdf"
    path = f"sanctions/{name}"

    c = canvas.Canvas(path, pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 780, "TATA CAPITAL LIMITED")
    c.setFont("Helvetica", 12)
    c.drawString(50, 740, "PERSONAL LOAN SANCTION LETTER")
    c.drawString(50, 700, f"Approved Loan Amount: ₹{amount}")
    c.drawString(50, 680, f"Risk Category: {risk}")
    c.drawString(50, 660, "Interest Rate: 11.5% p.a.")
    c.drawString(50, 640, f"Estimated EMI: ₹{int(amount/36)}")
    c.drawString(50, 600, "This is a system-generated sanction letter.")
    c.drawString(50, 560, "Tata Capital – Agentic AI Lending")
    c.showPage()
    c.save()
    return name

# ================= CHAT API =================
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):

    if req.session_id not in SESSIONS:
        SESSIONS[req.session_id] = {"stage": "MOBILE"}
        return ChatResponse(
            reply=(
                "👋 Hi! Welcome to **Tata Capital’s AI-Powered Personal Loan Assistant**.\n\n"
                "Let’s start with a quick verification.\n\n"
                "📱 Please enter your **10-digit mobile number**"
            )
        )

    s = SESSIONS[req.session_id]
    msg = req.message.strip().lower()

    def to_int(v):
        try: return int(v)
        except: return None

    # ---------- MOBILE ----------
    if s["stage"] == "MOBILE":
        if not msg.isdigit() or len(msg) != 10:
            return ChatResponse(reply="Please enter a valid **10-digit mobile number**.")
        s["mobile"] = msg
        s["otp"] = "1234"   # simulated OTP
        s["stage"] = "OTP"
        return ChatResponse(
            reply="📩 OTP sent to your mobile number.\nPlease enter the **4-digit OTP**"
        )

    # ---------- OTP ----------
    if s["stage"] == "OTP":
        if msg != s["otp"]:
            return ChatResponse(reply="❌ Incorrect OTP. Please try again.")
        s["stage"] = "PAN"
        return ChatResponse(
            reply="✅ Mobile verified.\n\nPlease enter the **last 4 characters of your PAN**"
        )

    # ---------- PAN ----------
    if s["stage"] == "PAN":
        if len(msg) != 4:
            return ChatResponse(reply="Please enter **last 4 characters of PAN**.")
        s["pan_last4"] = msg.upper()
        s["stage"] = "EMPLOYMENT"
        return ChatResponse(
            reply=(
                "💼 Please select your **employment type**:\n\n"
                "Type **SALARIED** or **SELF-EMPLOYED**"
            )
        )

    # ---------- EMPLOYMENT ----------
    if s["stage"] == "EMPLOYMENT":
        if msg not in ["salaried", "self-employed", "self employed"]:
            return ChatResponse(reply="Please type **SALARIED** or **SELF-EMPLOYED**.")
        s["employment"] = msg
        s["stage"] = "ORG"
        return ChatResponse(
            reply=(
                "🏢 Please enter your **company / business name**"
            )
        )

    # ---------- ORGANIZATION ----------
    if s["stage"] == "ORG":
        s["organization"] = msg.title()
        s["stage"] = "SALARY"
        return ChatResponse(
            reply="Thanks 👍 Now tell me your **monthly take-home salary (₹)**"
        )

    # ---------- SALARY ----------
    if s["stage"] == "SALARY":
        v = to_int(msg)
        if v is None:
            return ChatResponse(reply="Please enter salary in **numbers (₹)**.")
        s["salary"] = v
        s["stage"] = "CREDIT"
        return ChatResponse(reply="What is your **credit score**?")

    # ---------- CREDIT ----------
    if s["stage"] == "CREDIT":
        v = to_int(msg)
        if v is None:
            return ChatResponse(reply="Please enter credit score in numbers.")
        s["credit"] = v
        s["stage"] = "AMOUNT"
        return ChatResponse(reply="How much **loan amount (₹)** do you need?")

    # ---------- AMOUNT ----------
    if s["stage"] == "AMOUNT":
        v = to_int(msg)
        if v is None:
            return ChatResponse(reply="Please enter loan amount in numbers.")
        s["amount"] = v
        s["stage"] = "EMI"
        return ChatResponse(
            reply="Do you have any **existing monthly EMI**? Enter amount or **0**"
        )

    # ---------- EMI ----------
    if s["stage"] == "EMI":
        v = to_int(msg)
        if v is None:
            return ChatResponse(reply="Please enter EMI amount in numbers.")
        s["emi"] = v
        s["stage"] = "CONFIRM"
        return ChatResponse(
            reply=(
                "🔍 **Please confirm your details:**\n\n"
                f"• Mobile: {s['mobile']}\n"
                f"• Employment: {s['employment'].title()}\n"
                f"• Organization: {s['organization']}\n"
                f"• Salary: ₹{s['salary']}\n"
                f"• Credit Score: {s['credit']}\n"
                f"• Loan Amount: ₹{s['amount']}\n"
                f"• Existing EMI: ₹{s['emi']}\n\n"
                "Type **YES** to proceed or **NO** to modify details."
            )
        )

    # ---------- CONFIRM ----------
    if s["stage"] == "CONFIRM":

        if msg == "yes":
            s["stage"] = "PROCESSING"
            s["result"] = UnderwritingAgent().run({
                "credit_score": s["credit"],
                "loan_amount": s["amount"],
                "monthly_salary": s["salary"],
                "existing_emi": s["emi"]
            })
            return ChatResponse(reply="PROCESSING")

        if msg == "no":
            s.clear()
            s["stage"] = "SALARY"
            return ChatResponse(
                reply="No worries 😊\nPlease re-enter your **monthly take-home salary (₹)**"
            )

        return ChatResponse(
            reply="Please reply with **YES** or **NO**."
        )

    # ---------- PROCESSING ----------
    if s["stage"] == "PROCESSING":
        r = s["result"]
        s["stage"] = "DONE"

        if r["status"] == "REJECTED":
            return ChatResponse(
                reply=f"❌ **Loan Rejected**\nReason: {r['reason']}"
            )

        pdf = generate_pdf(s["amount"], r["risk"])
        return ChatResponse(
            reply=(
                "🎉 **Congratulations! Your loan is approved.**\n\n"
                f"• Approved Amount: ₹{s['amount']}\n"
                "• Interest Rate: 11.5% p.a.\n"
                "• Tenure: 36 months\n"
                f"• Estimated EMI: ₹{int(s['amount']/36)}"
            ),
            pdf_url=f"/sanctions/{pdf}"
        )

    return ChatResponse(reply="🙏 Thank you for choosing Tata Capital 💙")



# ================= PDF DOWNLOAD =================
@app.get("/sanctions/{file}")
def download(file: str):
    return FileResponse(f"sanctions/{file}", media_type="application/pdf")

# ================= WEB CHAT UI =================
@app.get("/", response_class=HTMLResponse)
def root():
    return """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Tata Capital – AI Loan Assistant</title>

<style>
:root{
 --bg:#eef3f8;--chat:#fff;--bot:#e6ecff;--user:#1a4db3;--text:#000;
}
.dark{
 --bg:#0f172a;--chat:#020617;--bot:#1e293b;--user:#2563eb;--text:#fff;
}

body{
 margin:0;
 background:var(--bg);
 font-family:Segoe UI,sans-serif;
 color:var(--text);
}

/* ---------- SPLASH SCREEN ---------- */
#splash{
 position:fixed;
 inset:0;
 background:linear-gradient(135deg,#0f3c91,#1a4db3);
 color:white;
 display:flex;
 flex-direction:column;
 justify-content:center;
 align-items:center;
 z-index:20;
 animation:fadeOut 1s ease forwards;
 animation-delay:2.5s;
}
#splash h1{margin:0;font-size:34px}
#splash p{opacity:.85;margin-top:8px}

@keyframes fadeOut{
 to{opacity:0;visibility:hidden}
}

/* ---------- CHAT UI ---------- */
.chat{
 width:420px;height:640px;
 background:var(--chat);
 margin:30px auto;
 border-radius:18px;
 box-shadow:0 14px 40px rgba(0,0,0,.25);
 display:flex;
 flex-direction:column;
}

.header{
 background:var(--user);
 color:white;
 padding:16px;
 text-align:center;
 font-weight:bold;
 position:relative;
 border-radius:18px 18px 0 0;
}

.toggle{
 position:absolute;
 right:14px;
 top:12px;
 cursor:pointer;
}

.messages{
 flex:1;
 padding:14px;
 overflow:auto;
 background:var(--bg);
}

.bot,.user{
 padding:12px 16px;
 margin:10px 0;
 border-radius:16px;
 max-width:75%;
 animation:slide .25s ease;
}

@keyframes slide{
 from{opacity:0;transform:translateY(6px)}
 to{opacity:1;transform:translateY(0)}
}

.bot{background:var(--bot)}
.user{background:var(--user);color:white;margin-left:auto}

.input{
 display:flex;
 padding:12px;
 border-top:1px solid #ccc;
}

input{
 flex:1;
 padding:12px;
 border-radius:10px;
 border:1px solid #ccc;
}

button{
 margin-left:8px;
 background:var(--user);
 color:white;
 border:none;
 padding:0 18px;
 border-radius:10px;
 cursor:pointer;
}

/* ---------- TYPING DOTS ---------- */
.typing{display:flex;gap:4px}
.typing span{
 width:6px;height:6px;
 background:var(--user);
 border-radius:50%;
 animation:blink 1.4s infinite;
}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}

@keyframes blink{
 0%{opacity:.2}20%{opacity:1}100%{opacity:.2}
}

/* ---------- APPROVAL / REJECTION ---------- */
#overlay{
 position:fixed;
 inset:0;
 background:rgba(0,0,0,.6);
 display:none;
 justify-content:center;
 align-items:center;
 flex-direction:column;
 color:white;
 z-index:30;
}
.circle{
 width:90px;height:90px;
 border-radius:50%;
 border:6px solid #22c55e;
 display:flex;
 justify-content:center;
 align-items:center;
 font-size:44px;
}
.reject{border-color:#ef4444}
</style>
</head>

<body>

<!-- SPLASH -->
<div id="splash">
  <h1>Tata Capital</h1>
  <p>AI-Powered Personal Loans</p>
</div>

<!-- APPROVAL / REJECTION -->
<div id="overlay">
  <div id="circle" class="circle">✔</div>
  <p id="ot"></p>
</div>

<div class="chat">
 <div class="header">
   Tata Capital AI Loan Assistant
   <span class="toggle" onclick="toggle()">🌙</span>
 </div>
 <div class="messages" id="m"></div>
 <div class="input">
  <input id="i" placeholder="Type your message here…" />
  <button onclick="send()">Send</button>
 </div>
</div>

<script>
let sid=crypto.randomUUID(),dark=false;
const m=document.getElementById("m"),i=document.getElementById("i");

function add(cls,txt){
 m.innerHTML+=`<div class="${cls}">${txt.replaceAll("\\n","<br>")}</div>`;
 m.scrollTop=m.scrollHeight;
}

function typing(){
 m.innerHTML+=`<div class="bot" id="t">
   <div class="typing"><span></span><span></span><span></span></div>
 </div>`;
 m.scrollTop=m.scrollHeight;
}
function stop(){let t=document.getElementById("t");if(t)t.remove()}

function overlay(ok,msg){
 document.getElementById("circle").innerText=ok?"✔":"✖";
 document.getElementById("circle").className=ok?"circle":"circle reject";
 document.getElementById("ot").innerText=msg;
 document.getElementById("overlay").style.display="flex";
 setTimeout(()=>document.getElementById("overlay").style.display="none",2200);
}

function toggle(){
 dark=!dark;
 document.body.className=dark?"dark":"";
}

window.onload=async()=>{
 setTimeout(async()=>{
   const r=await fetch("/chat",{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({session_id:sid,message:"Hi"})});
   const d=await r.json();
   add("bot",d.reply);
 },2700);
}

async function send(){
 if(!i.value.trim())return;
 add("user",i.value);
 let txt=i.value;i.value="";
 typing();

 const r=await fetch("/chat",{method:"POST",headers:{"Content-Type":"application/json"},
 body:JSON.stringify({session_id:sid,message:txt})});
 const d=await r.json();
 stop();

 if(d.reply==="PROCESSING"){
   typing();
   setTimeout(async()=>{
     stop();
     const r2=await fetch("/chat",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({session_id:sid,message:"ok"})});
     const d2=await r2.json();
     overlay(!d2.reply.includes("Rejected"),
             d2.reply.includes("Rejected")?"Loan Rejected":"Loan Approved");
     add("bot",d2.reply);
     if(d2.pdf_url)
       add("bot",`📄 <a href="${d2.pdf_url}" target="_blank">Download Sanction Letter</a>`);
   },2200);
   return;
 }
 add("bot",d.reply);
}
</script>

</body>
</html>
"""
