from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class UnderwritingInput(BaseModel):
    customer_data: dict

@app.post("/assess")
def assess_customer(data: UnderwritingInput):
    """
    Simple Underwriting Logic:
    - Tier 1: High income, low obligations
    - Tier 2: Medium income, moderate obligations
    - Tier 3: Low income, high obligations (rejection)
    """

    customer = data.customer_data.get("customer", {})
    employment = data.customer_data.get("employment", {})
    loan_request = data.customer_data.get("loan_request", {})
    existing_obligations = data.customer_data.get("existing_obligations", {})

    monthly_income = employment.get("monthly_net_income", 0)
    loan_amount = loan_request.get("amount", 0)
    tenor = loan_request.get("tenor_months", 1)
    existing_emi = existing_obligations.get("total_monthly_emi", 0)

    # Simple EMI calculation
    requested_emi = loan_amount / tenor
    dti = (existing_emi + requested_emi) / max(monthly_income, 1)

    # Simple credit tiering
    if monthly_income >= 50000 and dti <= 0.4:
        tier = "Tier 1"
    elif monthly_income >= 30000 and dti <= 0.5:
        tier = "Tier 2"
    else:
        tier = "Tier 3"

    return {
        "tier": tier,
        "monthly_income": monthly_income,
        "requested_emi": requested_emi,
        "existing_emi": existing_emi,
        "dti": round(dti, 2)
    }

@app.get("/")
def home():
    return {"message": "Underwriting Agent is running!"}
