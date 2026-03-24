class SanctionAgent:
    def run(self, risk_data):
        risk = risk_data.get("risk")

        if risk == "LOW":
            return {
                "approved": True,
                "message": "Congratulations Your loan is approved at the best interest rate."
            }

        if risk == "MEDIUM":
            return {
                "approved": True,
                "message": "Your loan is approved with a slightly higher interest rate."
            }

        return {
            "approved": False,
            "message": "Sorry, your loan cannot be approved due to high credit risk."
        }
