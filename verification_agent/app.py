from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class VerificationInput(BaseModel):
    customer_data: dict

@app.post("/verify")
def verify_customer(data: VerificationInput):
    """
    Simple mock verification:
    - Checks if PAN is 10 chars
    - Checks if mobile number is 10 digits
    - Marks verification status
    """

    customer = data.customer_data.get("customer", {})
    pan = customer.get("pan", "")
    mobile = customer.get("mobile", "")

    status = "verified"
    notes = []

    if len(pan) != 10:
        status = "failed"
        notes.append("Invalid PAN")
    if len(mobile) != 10 and not mobile.startswith("+91"):
        status = "failed"
        notes.append("Invalid Mobile number")

    return {
        "verification_status": status,
        "notes": notes
    }

@app.get("/")
def home():
    return {"message": "Verification Agent API is running!"}
