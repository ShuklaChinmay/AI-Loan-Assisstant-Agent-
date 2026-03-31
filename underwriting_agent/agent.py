from utils.llm import llm_call

class UnderwritingAgent:

    def run(self, user_data):

        credit_score = user_data.get("credit_score", 0)
        loan_amount = user_data.get("loan_amount", 0)
        preapproved_limit = user_data.get("preapproved_limit", 0)
        monthly_salary = user_data.get("monthly_salary", 0)
        existing_emi = user_data.get("existing_emi", 0)

        # Step 1: Validate input
        if credit_score == 0 or loan_amount == 0 or monthly_salary == 0:
            return {
                "approved": False,
                "risk": "HIGH",
                "message": "Insufficient financial data for loan assessment."
            }

        # ---- Step 2: Credit Score Rule ----
        if credit_score < 700:
            return {
                "approved": False,
                "risk": "HIGH",
                "message": "Your credit score is below 700, which does not meet our eligibility criteria."
            }

        if credit_score >= 750:
            risk = "LOW"
        else:
            risk = "MEDIUM"

        # ---- Step 3: Eligibility Rules ----
        approved = False
        reason = ""

        # Case 1: Within pre-approved limit
        if loan_amount <= preapproved_limit:
            approved = True
            reason = "Loan is within your pre-approved limit."

        # Case 2: Slightly above limit
        elif loan_amount <= 2 * preapproved_limit:

            # Improved EMI estimation (still simple)
            expected_emi = loan_amount / 24

            if expected_emi + existing_emi <= 0.5 * monthly_salary:
                approved = True
                reason = "Your income can support the requested loan amount."
            else:
                approved = False
                reason = "Your total EMI would exceed 50% of your monthly salary."

        # Case 3: Too high loan
        else:
            approved = False
            reason = "Requested loan amount exceeds eligibility limits."

        # Step 4: AI Explanation (controlled usage)
        prompt = f"""
        You are a bank underwriting officer.

        User details:
        Credit Score: {credit_score}
        Loan Amount: {loan_amount}
        Salary: {monthly_salary}
        Existing EMI: {existing_emi}

        Decision: {"Approved" if approved else "Rejected"}
        Risk Level: {risk}

        Explain the decision clearly and professionally.
        """

        try:
            ai_message = llm_call(prompt)
        except:
            ai_message = reason

        # Step 5: Final Output (STANDARDIZED)
        return {
            "approved": approved,
            "risk": risk,
            "message": ai_message
        }
