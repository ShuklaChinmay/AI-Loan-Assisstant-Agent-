class SalesAgent:
    def run(self, user_data):
        income = user_data.get("income", 0)

        if income < 15000:
            return {
                "interested": False,
                "reason": "Income too low for loan offers"
            }

        return {
            "interested": True,
            "reason": "User qualifies as a potential lead"
        }
