from fastapi import FastAPI
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

class SalesInput(BaseModel):
    customer_message: str

@app.post("/sales")
def sales_agent(customer: SalesInput):

    prompt = f"""
    You are the *Sales Worker Agent*.
    Your job:
    - Greet the customer
    - Collect loan amount, salary, age, employment type
    - Do NOT approve or reject loan
    - Send structured data back to Master Agent

    Customer says: "{customer.customer_message}"

    Respond briefly.
    Also return extracted info in JSON:
    {{
      "loan_amount": "",
      "salary": "",
      "age": "",
      "employment_type": ""
    }}
    """

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role":"user", "content": prompt}]
    )

    return {"sales_agent_reply": response['choices'][0]['message']['content']}

@app.get("/")
def home():
    return {"message": "Sales Agent API is running!"}
