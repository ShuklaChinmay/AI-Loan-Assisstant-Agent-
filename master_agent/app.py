from fastapi import FastAPI
from master_agent.agent import MasterAgent

app = FastAPI()
master_agent = MasterAgent()

@app.post("/chat")
def chat(payload: dict):
    message = payload.get("message", "")
    user_data = payload.get("user_data", {})

    reply = master_agent.handle_message(message, user_data)
    return {"reply": reply}
