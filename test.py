import requests
import uuid

URL = "http://127.0.0.1:8000/chat"   # 👈 IMPORTANT

session_id = str(uuid.uuid4())

messages = [
    "Hi",
    "45000",
    "720",
    "300000",
    "5000",
    "YES"
]

for msg in messages:
    payload = {
        "session_id": session_id,
        "message": msg
    }

    resp = requests.post(URL, json=payload)
    print("\nUser:", msg)
    print("Bot:", resp.json()["reply"])
