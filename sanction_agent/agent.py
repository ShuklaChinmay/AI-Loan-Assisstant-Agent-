from utils.llm import llm_call

class SanctionAgent:
    def run(self, risk_data):

        risk = risk_data.get("risk")
        loan_amount = risk_data.get("loan_amount", 0)

        # Default interest rates based on risk
        if risk == "LOW":
            interest_rate = 9
            approved = True

        elif risk == "MEDIUM":
            interest_rate = 12
            approved = True

        else:
            return {
                "approved": False,
                "message": "Sorry, your loan cannot be approved due to high credit risk."
            }

        # EMI calculation (simple)
        tenure = 24  # months
        monthly_interest = interest_rate / (12 * 100)

        emi = 0
        try:
            emi = (loan_amount * monthly_interest * (1 + monthly_interest)**tenure) / ((1 + monthly_interest)**tenure - 1)
            emi = round(emi, 2)
        except:
            emi = loan_amount / tenure if loan_amount else 0

        # AI explanation
        prompt = f"""
        You are a bank loan officer.

        Loan Approved:
        Amount: {loan_amount}
        Interest Rate: {interest_rate}%
        EMI: {emi}

        Explain this loan approval in a friendly and professional tone.
        """

        try:
            ai_message = llm_call(prompt)
        except:
            ai_message = (
                f"Congratulations! Your loan of ₹{loan_amount} is approved at {interest_rate}% interest. "
                f"Your monthly EMI will be approximately ₹{emi}."
            )

        return {
            "approved": approved,
            "loan_amount": loan_amount,
            "interest_rate": interest_rate,
            "emi": emi,
            "message": ai_message
        }
