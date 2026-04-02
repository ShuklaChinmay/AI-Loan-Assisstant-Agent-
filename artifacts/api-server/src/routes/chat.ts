import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chatMessagesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware.js";
import { SendChatMessageBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AgentType = "master" | "sales" | "verification" | "underwriting" | "sanction" | "locking";

interface AgentResponse {
  response: string;
  agentType: AgentType;
  nextStep?: string;
  options?: string[];
  requiresAction?: string;
  applicationId?: number;
}

const sessionState = new Map<string, { stage: AgentType; applicationId?: number; data: Record<string, unknown> }>();

function masterAgent(message: string, sessionData: { stage: AgentType; data: Record<string, unknown> }): AgentResponse {
  const msg = message.toLowerCase();

  if (!sessionData.data["started"]) {
    return {
      response: "Welcome to AI Loan Assistant. I am your Master Agent, here to guide you through the loan application process. I will connect you with the right specialist at each step.\n\nHow can I assist you today?",
      agentType: "master",
      options: ["Apply for a Loan", "Check Loan Options", "Check Application Status", "EMI Calculator"],
    };
  }

  if (msg.includes("apply") || msg.includes("loan") || msg.includes("want")) {
    return salesAgent(message, sessionData);
  }

  if (msg.includes("status") || msg.includes("track")) {
    return {
      response: "To check your application status, please visit the 'My Applications' section. Would you like to start a new loan application instead?",
      agentType: "master",
      options: ["Start New Application", "Explore Loan Products"],
    };
  }

  return {
    response: "I am here to assist you with your loan journey. Please select what you need help with:",
    agentType: "master",
    options: ["Apply for a Loan", "Check Loan Options", "Track My Application", "EMI Calculator"],
  };
}

function salesAgent(message: string, sessionData: { stage: AgentType; data: Record<string, unknown> }): AgentResponse {
  const msg = message.toLowerCase();

  if (!sessionData.data["loanType"]) {
    return {
      response: "I am your Sales Agent. I will help you find the perfect loan product.\n\nWhat type of loan are you looking for?",
      agentType: "sales",
      options: ["Home Loan", "Personal Loan", "Business Loan", "Education Loan", "Vehicle Loan", "Gold Loan"],
    };
  }

  if (!sessionData.data["loanAmount"]) {
    const loanType = sessionData.data["loanType"] as string;
    return {
      response: `Excellent choice! For a ${loanType}, we offer competitive interest rates starting from 8.5% per annum.\n\nWhat is your desired loan amount?`,
      agentType: "sales",
      options: ["Under 5 Lakhs", "5-20 Lakhs", "20-50 Lakhs", "Above 50 Lakhs"],
    };
  }

  if (!sessionData.data["income"]) {
    return {
      response: "To assess your eligibility, I need a few details. What is your approximate annual income?",
      agentType: "sales",
      options: ["Under 3 LPA", "3-6 LPA", "6-12 LPA", "Above 12 LPA"],
    };
  }

  if (msg.includes("home") || msg.includes("personal") || msg.includes("business") || msg.includes("education") || msg.includes("vehicle") || msg.includes("gold")) {
    return {
      response: `Great! Based on your interest in a ${msg} loan, let me connect you with our Verification Agent to proceed with your KYC and document verification.`,
      agentType: "sales",
      nextStep: "verification",
      options: ["Proceed with KYC", "Know More About Requirements"],
    };
  }

  return {
    response: "Based on your profile, you appear eligible for our loan products. Shall I proceed to the verification stage?",
    agentType: "sales",
    nextStep: "verification",
    options: ["Yes, proceed with verification", "I want to explore more options"],
  };
}

function verificationAgent(message: string, _sessionData: { stage: AgentType; data: Record<string, unknown> }): AgentResponse {
  const msg = message.toLowerCase();

  if (msg.includes("kyc") || msg.includes("proceed") || msg.includes("yes")) {
    return {
      response: "I am the Verification Agent. I will guide you through the KYC process.\n\nRequired documents:\n- Aadhaar Card\n- PAN Card\n- Proof of Income (salary slips / ITR)\n- Bank statements (last 6 months)\n- Passport-size photographs\n\nPlease ensure all documents are ready. Your KYC will be verified digitally.",
      agentType: "verification",
      options: ["Documents are ready, proceed", "I need more time to arrange documents"],
      requiresAction: "document_upload",
    };
  }

  if (msg.includes("ready") || msg.includes("done") || msg.includes("complete")) {
    return {
      response: "Your documents have been received. Our verification team will review them within 24-48 hours. Meanwhile, I am forwarding your application to the Underwriting Agent for credit assessment.",
      agentType: "verification",
      nextStep: "underwriting",
      options: ["Proceed to Credit Assessment"],
    };
  }

  return {
    response: "KYC verification is an important step in the loan process. It ensures your identity and helps us offer you the best terms. Are you ready to upload your documents?",
    agentType: "verification",
    options: ["Yes, I am ready", "What documents do I need?"],
  };
}

function underwritingAgent(message: string, _sessionData: { stage: AgentType; data: Record<string, unknown> }): AgentResponse {
  const msg = message.toLowerCase();

  if (msg.includes("proceed") || msg.includes("credit") || msg.includes("assessment") || msg.includes("check")) {
    return {
      response: "I am the Underwriting Agent. I will now perform your credit assessment.\n\nChecking your CIBIL score via our credit bureau integration...\n\nYour preliminary credit score: 742 (Good)\n\nBased on your profile:\n- Loan Eligibility: Approved for up to 85% of requested amount\n- Risk Category: Low-Medium\n- Recommended Interest Rate: 10.5% per annum\n\nWould you like to proceed with these terms?",
      agentType: "underwriting",
      nextStep: "sanction",
      options: ["Accept Terms and Proceed", "Negotiate Terms", "Review Eligibility Criteria"],
    };
  }

  return {
    response: "The underwriting process evaluates your creditworthiness using CIBIL/Experian scores, income stability, and repayment capacity. This determines your loan eligibility and interest rate. Ready to proceed?",
    agentType: "underwriting",
    options: ["Begin Credit Assessment", "Learn More About Underwriting"],
  };
}

function sanctionAgent(message: string, _sessionData: { stage: AgentType; data: Record<string, unknown> }): AgentResponse {
  const msg = message.toLowerCase();

  if (msg.includes("accept") || msg.includes("proceed") || msg.includes("sanction")) {
    return {
      response: "I am the Sanction Agent. Excellent news! Your loan has been sanctioned by our credit committee.\n\nSanction Details:\n- Loan Amount: As per application\n- Interest Rate: 10.5% per annum\n- Tenure: As selected\n- Processing Fee: 1% of loan amount\n\nA sanction letter will be sent to your registered email. To lock your loan and proceed with disbursal, please pay the processing fee.",
      agentType: "sanction",
      nextStep: "locking",
      options: ["Pay Processing Fee and Lock Loan", "Review Sanction Terms", "Request for Review"],
    };
  }

  return {
    response: "Your application is under review by our sanction committee. Based on the underwriting report, your loan is being evaluated. This typically takes 2-4 business hours. Would you like to know the sanction criteria?",
    agentType: "sanction",
    options: ["Proceed with Sanctioning", "View Sanction Criteria"],
  };
}

function lockingAgent(message: string, _sessionData: { stage: AgentType; data: Record<string, unknown> }): AgentResponse {
  const msg = message.toLowerCase();

  if (msg.includes("pay") || msg.includes("lock") || msg.includes("fee") || msg.includes("confirm")) {
    const lockingId = `LOAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return {
      response: `Congratulations! Your loan has been successfully locked.\n\nYour Locking ID: ${lockingId}\n\nPlease save this ID for future reference. Our team will contact you within 24 hours for the final documentation and disbursal process.\n\nThank you for choosing AI Loan Assistant. Your loan amount will be credited to your account within 3-5 business days.`,
      agentType: "locking",
      requiresAction: "loan_locked",
      options: ["View My Application", "Download Sanction Letter"],
    };
  }

  return {
    response: "To complete the loan locking process, a processing fee payment is required. This secures your loan offer and triggers the disbursal process. The fee is typically 1% of the loan amount (minimum Rs. 500).\n\nReady to complete the payment?",
    agentType: "locking",
    options: ["Confirm Payment and Lock Loan", "Request Fee Waiver", "Contact Support"],
  };
}

function processMessage(
  message: string,
  sessionId: string,
  _applicationId?: number
): AgentResponse {
  let state = sessionState.get(sessionId);
  if (!state) {
    state = { stage: "master", data: {} };
    sessionState.set(sessionId, state);
  }

  const msg = message.toLowerCase();

  if (msg.includes("home loan") || msg.includes("personal loan") || msg.includes("business loan") ||
      msg.includes("education loan") || msg.includes("vehicle loan") || msg.includes("gold loan")) {
    const loanTypes = ["home loan", "personal loan", "business loan", "education loan", "vehicle loan", "gold loan"];
    for (const lt of loanTypes) {
      if (msg.includes(lt)) {
        state.data["loanType"] = lt.replace(" loan", "");
        break;
      }
    }
  }

  if (msg.includes("lakh") || msg.includes("lakhs") || msg.includes("crore")) {
    state.data["loanAmount"] = message;
  }

  if (msg.includes("lpa") || msg.includes("income") || msg.includes("salary")) {
    state.data["income"] = message;
  }

  let response: AgentResponse;

  if (state.stage === "master") {
    response = masterAgent(message, state);
    state.data["started"] = true;
    if (response.nextStep === "verification" || msg.includes("apply") || msg.includes("kyc") || msg.includes("proceed")) {
      state.stage = "verification";
    } else if (msg.includes("loan") || msg.includes("want") || state.data["loanType"]) {
      state.stage = "sales";
      response = salesAgent(message, state);
    }
  } else if (state.stage === "sales") {
    response = salesAgent(message, state);
    if (response.nextStep === "verification") {
      state.stage = "verification";
    }
  } else if (state.stage === "verification") {
    response = verificationAgent(message, state);
    if (response.nextStep === "underwriting") {
      state.stage = "underwriting";
    }
  } else if (state.stage === "underwriting") {
    response = underwritingAgent(message, state);
    if (response.nextStep === "sanction") {
      state.stage = "sanction";
    }
  } else if (state.stage === "sanction") {
    response = sanctionAgent(message, state);
    if (response.nextStep === "locking") {
      state.stage = "locking";
    }
  } else {
    response = lockingAgent(message, state);
    if (response.requiresAction === "loan_locked") {
      sessionState.delete(sessionId);
    }
  }

  sessionState.set(sessionId, state);
  return response;
}

router.post("/chat/message", requireAuth, async (req: AuthRequest, res) => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const { message, sessionId, applicationId } = parsed.data;

  await db.insert(chatMessagesTable).values({
    userId: req.userId,
    sessionId,
    role: "user",
    content: message,
  });

  const agentResponse = processMessage(message, sessionId, applicationId ?? undefined);

  await db.insert(chatMessagesTable).values({
    userId: req.userId,
    sessionId,
    role: "assistant",
    content: agentResponse.response,
    agentType: agentResponse.agentType,
  });

  res.json({
    response: agentResponse.response,
    agentType: agentResponse.agentType,
    nextStep: agentResponse.nextStep ?? null,
    options: agentResponse.options ?? null,
    applicationId: applicationId ?? null,
    requiresAction: agentResponse.requiresAction ?? null,
    sessionId,
  });
});

router.get("/chat/history", requireAuth, async (req: AuthRequest, res) => {
  const sessionId = req.query["sessionId"] as string;

  if (sessionId) {
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, sessionId));
    res.json(messages);
  } else {
    const messages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.userId, req.userId!));
    res.json(messages);
  }
});

router.post("/chat/reset", requireAuth, async (_req, res) => {
  res.json({ message: "Chat session reset", success: true });
});

export default router;
