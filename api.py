from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(
    title="AI Loan Agent API",
    description="Agentic AI powered personal loan decision system",
    version="1.0"
)

# -------------------------
# Request schema (Android → Backend)
# -------------------------
class LoanRequest(BaseModel):
    income: float
    loan_amount: float
    tenure: int
    credit_score: int


# -------------------------
# Response schema (Backend → Android)
# -------------------------
class LoanResponse(BaseModel):
    eligible: bool
    approved_amount: int
    interest_rate: float
    emi: int
    risk: str
    reason: str


# -------------------------
# MAIN API
# -------------------------
@app.post("/predict-loan", response_model=LoanResponse)
def predict_loan(data: LoanRequest):

    """
    This endpoint connects Android app with Agentic AI system
    """

    # ============================
    # 🔥 HERE AGENTIC AI WILL RUN
    # ============================

    # 👉 Example (replace with real agent call)
    # result = run_agent_pipeline(data.dict())

    # ----------------------------
    # TEMP DEMO LOGIC (SAFE)
    # ----------------------------
    if data.income > 30000 and data.credit_score >= 700:
        eligible = True
        approved_amount = int(data.loan_amount * 0.8)
        interest_rate = 10.5
        risk = "Low"
        reason = "Stable income and good credit history"
    else:
        eligible = False
        approved_amount = 0
        interest_rate = 0.0
        risk = "High"
        reason = "Low income or poor credit score"

    emi = int(
        approved_amount / data.tenure
    ) if eligible else 0

    return LoanResponse(
        eligible=eligible,
        approved_amount=approved_amount,
        interest_rate=interest_rate,
        emi=emi,
        risk=risk,
        reason=reason
    )
