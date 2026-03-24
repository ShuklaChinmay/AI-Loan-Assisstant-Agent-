from fastapi import FastAPI
from pydantic import BaseModel
from fpdf import FPDF
import os

app = FastAPI()

class SanctionInput(BaseModel):
    customer_data: dict
    underwriting_result: dict

@app.post("/generate")
def generate_sanction(data: SanctionInput):
    customer = data.customer_data.get("customer", {})
    tier = data.underwriting_result.get("tier", "Tier 3")

    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt="Loan Sanction Letter", ln=True, align="C")
    pdf.ln(10)
    pdf.multi_cell(0, 10, txt=f"Dear {customer.get('name','Customer')},\n\n"
                               f"We are pleased to inform you that your loan request has been {tier} approved.\n\n"
                               f"Loan Amount: {data.customer_data.get('loan_request', {}).get('amount','N/A')}\n"
                               f"Tenor: {data.customer_data.get('loan_request', {}).get('tenor_months','N/A')} months\n\n"
                               f"Thank you for choosing us.\n\nBest Regards,\nNBFC Team")

    # Save PDF temporarily
    if not os.path.exists("letters"):
        os.makedirs("letters")
    file_path = f"letters/sanction_{customer.get('name','customer')}.pdf"
    pdf.output(file_path)

    return {
        "message": f"Sanction letter generated for {customer.get('name','Customer')}",
        "file_path": file_path
    }

@app.get("/")
def home():
    return {"message": "Sanction Agent API is running!"}
