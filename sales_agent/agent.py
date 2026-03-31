from utils.llm import llm_call

class SalesAgent:
    def run(self, user_data):
        income = user_data.get("income")
        employment = user_data.get("employment_type", "unknown")
        credit_score = user_data.get("credit_score")

        # Step 1: Missing data handling
        if not income:
            return {
                "interested": False,
                "message": "Please provide your monthly income to check loan eligibility."
            }

        if not credit_score:
            return {
                "interested": False,
                "message": "Please provide your credit score to proceed."
            }

        # Step 2: Hard validation (VERY IMPORTANT)
        if income < 15000:
            return {
                "interested": False,
                "message": "Your income seems too low for our loan offers."
            }

        if credit_score < 600:
            return {
                "interested": False,
                "message": "Your credit score is too low for loan approval."
            }

        # Step 3: Deterministic logic (CORE SYSTEM)
        loan_amount = income * 10

        if credit_score >= 750:
            interest_rate = 9
        elif credit_score >= 700:
            interest_rate = 10
        else:
            interest_rate = 12

        if employment.lower() == "self-employed":
            interest_rate += 1

        # Step 4: AI explanation (ONLY for UX)
        prompt = f"""
        You are a professional loan advisor.

        User details:
        Income: {income}
        Employment: {employment}
        Credit Score: {credit_score}

        Explain in a friendly way:
        - Loan eligibility
        - Loan amount: {loan_amount}
        - Interest rate: {interest_rate}%
        """

        try:
            ai_message = llm_call(prompt)
        except:
            ai_message = (
                f"You are eligible for a loan up to ₹{loan_amount} "
                f"at approximately {interest_rate}% interest rate."
            )

        # Step 5: Return structured + AI message
        return {
            "interested": True,
            "loan_amount": loan_amount,
            "interest_rate": interest_rate,
            "message": ai_message
        }
