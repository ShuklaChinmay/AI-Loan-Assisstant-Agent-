class UnderwritingAgent:

    def run(self, user_data):
        credit_score = user_data.get("credit_score", 0)
        loan_amount = user_data.get("loan_amount", 0)
        preapproved_limit = user_data.get("preapproved_limit", 0)
        monthly_salary = user_data.get("monthly_salary", 0)
        existing_emi = user_data.get("existing_emi", 0)

        # ---- Credit Score Rule (as per problem statement) ----
        if credit_score < 700:
            return {
                "status": "REJECTED",
                "risk": "HIGH",
                "reason": "Credit score below 700"
            }

        if credit_score >= 750:
            risk = "LOW"
        else:
            risk = "MEDIUM"

        # ---- Eligibility Rules ----
        if loan_amount <= preapproved_limit:
            return {
                "status": "APPROVED",
                "risk": risk,
                "reason": "Within pre-approved limit"
            }

        if loan_amount <= 2 * preapproved_limit:
            expected_emi = loan_amount / 24  # simplified EMI logic for demo

            if expected_emi + existing_emi <= 0.5 * monthly_salary:
                return {
                    "status": "APPROVED",
                    "risk": risk,
                    "reason": "Income supports requested loan amount"
                }
            else:
                return {
                    "status": "REJECTED",
                    "risk": risk,
                    "reason": "EMI exceeds 50% of monthly salary"
                }

        return {
            "status": "REJECTED",
            "risk": risk,
            "reason": "Loan amount exceeds eligibility limits"
        }
