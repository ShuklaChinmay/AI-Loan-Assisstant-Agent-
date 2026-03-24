import requests
import json

MASTER_URL = "http://127.0.0.1:8000/chat"

# Example synthetic customer data
customer_data = {
    "customer": {
        "name": "Chinmay Shukla",
        "pan": "ABCDE1234F",
        "mobile": "9876543210"
    },
    "employment": {
        "monthly_net_income": 60000
    },
    "loan_request": {
        "amount": 50000,
        "tenor_months": 12
    },
    "existing_obligations": {
        "total_monthly_emi": 10000
    }
}

# Example messages simulating a conversation
messages = [
    "Hi, I want a personal loan",
    "My PAN is ABCDE1234F and my mobile is 9876543210",
    "I want to borrow 50,000 for 12 months"
]

for msg in messages:
    payload = {
        "message": msg,
        "customer_data": customer_data
    }
    resp = requests.post(MASTER_URL, json=payload)
    print("\nCustomer Message:", msg)
    try:
        print("\nResponse (raw text):", resp.text)
        print("Response (as JSON):", json.dumps(resp.json(), indent=4))
    except Exception as e:
        print("\n🔥 ERROR:", e)
        print("👉 Server Response Text:", resp.text)
        print("👉 Server Status Code:", resp.status_code)
    break

