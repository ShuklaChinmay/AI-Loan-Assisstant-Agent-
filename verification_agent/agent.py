from utils.llm import llm_call

class VerificationAgent:
    def run(self, user_data):

        name = user_data.get("name")
        age = user_data.get("age")
        pan = user_data.get("pan")
        aadhaar = user_data.get("aadhaar")
        kyc_done = user_data.get("kyc_done", False)

        # Step 1: Check missing details
        missing_fields = []

        if not name:
            missing_fields.append("name")
        if not age:
            missing_fields.append("age")
        if not pan:
            missing_fields.append("PAN card")
        if not aadhaar:
            missing_fields.append("Aadhaar number")

        if missing_fields:
            return {
                "verified": False,
                "message": f"Please provide the following details to complete KYC: {', '.join(missing_fields)}."
            }

        # Step 2: Basic validation
        if age < 18:
            return {
                "verified": False,
                "message": "You must be at least 18 years old to apply for a loan."
            }

        if len(str(pan)) != 10:
            return {
                "verified": False,
                "message": "Invalid PAN number. Please provide a valid 10-character PAN."
            }

        if len(str(aadhaar)) != 12:
            return {
                "verified": False,
                "message": "Invalid Aadhaar number. It should be 12 digits."
            }

        # Step 3: Mark KYC as done
        user_data["kyc_done"] = True

        # Step 4: AI-generated confirmation message
        prompt = f"""
        You are a KYC verification officer.

        User details:
        Name: {name}
        Age: {age}

        Confirm KYC verification in a friendly and professional tone.
        """

        try:
            ai_message = llm_call(prompt)
        except:
            ai_message = "Your KYC has been successfully verified. You can now proceed with the loan process."

        return {
            "verified": True,
            "message": ai_message
        }
