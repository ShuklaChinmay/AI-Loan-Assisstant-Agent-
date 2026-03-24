class VerificationAgent:
    def run(self, user_data):
        if user_data.get("kyc_done"):
            return {
                "verified": True
            }

        return {
            "verified": False
        }
