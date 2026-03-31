from sales_agent.agent import SalesAgent
from verification_agent.agent import VerificationAgent
from underwriting_agent.agent import UnderwritingAgent
from sanction_agent.agent import SanctionAgent


class MasterAgent:
    def __init__(self):
        self.sales_agent = SalesAgent()
        self.verification_agent = VerificationAgent()
        self.underwriting_agent = UnderwritingAgent()
        self.sanction_agent = SanctionAgent()

    def handle_message(self, message, user_data):
        message = message.lower()

        # Step 0: Greeting
        if not message:
            return "Hello! I can help you with personal loans. How can I assist you today?"

        # Step 1: Detect Intent (basic for now)
        intent = self.detect_intent(message)

        # Step 2: Loan Flow
        if intent == "loan":

            # Greeting state
            if not user_data.get("greeted"):
                user_data["greeted"] = True
                return "Sure! I can help you with a personal loan. May I know your income and employment type?"

            # Step 2.1: Sales Qualification
            sales_result = self.sales_agent.run(user_data)

            if not sales_result.get("interested", True):
                return "At the moment, you may not be eligible for our loan offers."

            # Step 2.2: Verification
            verification_result = self.verification_agent.run(user_data)

            if not verification_result.get("verified", False):
                return "Please complete your KYC to proceed further."

            # Step 2.3: Underwriting
            risk_result = self.underwriting_agent.run(user_data)

            # Step 2.4: Sanction
            sanction_result = self.sanction_agent.run(risk_result)

            return sanction_result.get("message", "Your loan is being processed.")

        # Step 3: Interest Queries
        elif intent == "interest":
            return (
                "Interest rates depend on your profile, income, and credit score. "
                "We offer competitive rates and flexible EMI options."
            )

        # Step 4: Fallback (IMPORTANT)
        else:
            return self.general_response(message)

    # Intent Detection (upgrade later with LLM)
    def detect_intent(self, message):
        if any(word in message for word in ["loan", "borrow", "money"]):
            return "loan"
        elif "interest" in message:
            return "interest"
        else:
            return "general"

    # Smart fallback
    def general_response(self, message):
        return (
            "I'm here to help you with loans, EMI calculations, eligibility, and KYC. "
            "Could you please tell me what you're looking for?"
        )
