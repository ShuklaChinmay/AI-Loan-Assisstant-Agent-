import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { loanProductsTable, loanApplicationsTable, usersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth-middleware.js";
import {
  CalculateEmiBody,
  CreateApplicationBody,
  CreateLoanProductBody,
  UpdateApplicationStatusBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/loans", async (_req, res) => {
  const loans = await db.select().from(loanProductsTable).where(eq(loanProductsTable.isActive, true));
  res.json(loans);
});

router.get("/loans/:id", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  const [loan] = await db.select().from(loanProductsTable).where(eq(loanProductsTable.id, id));
  if (!loan) {
    res.status(404).json({ message: "Loan product not found" });
    return;
  }
  res.json(loan);
});

router.post("/loans/:id/emi", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  const parsed = CalculateEmiBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const [loan] = await db.select().from(loanProductsTable).where(eq(loanProductsTable.id, id));
  if (!loan) {
    res.status(404).json({ message: "Loan product not found" });
    return;
  }

  const { loanAmount, tenureMonths, interestRate } = parsed.data;
  const monthlyRate = interestRate / 12 / 100;
  const monthlyEmi = monthlyRate === 0
    ? loanAmount / tenureMonths
    : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  const totalAmount = monthlyEmi * tenureMonths;
  const totalInterest = totalAmount - loanAmount;
  const processingFee = loanAmount * (loan.processingFeePercent / 100);

  res.json({
    monthlyEmi: Math.round(monthlyEmi * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    processingFee: Math.round(processingFee * 100) / 100,
    loanAmount,
    tenureMonths,
    interestRate,
  });
});

router.get("/applications", requireAuth, async (req: AuthRequest, res) => {
  const applications = await db
    .select()
    .from(loanApplicationsTable)
    .where(eq(loanApplicationsTable.userId, req.userId!));
  res.json(applications);
});

router.post("/applications", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const [loan] = await db.select().from(loanProductsTable)
    .where(eq(loanProductsTable.id, parsed.data.loanProductId));
  if (!loan) {
    res.status(404).json({ message: "Loan product not found" });
    return;
  }

  const [application] = await db.insert(loanApplicationsTable).values({
    userId: req.userId!,
    loanProductId: parsed.data.loanProductId,
    loanProductName: loan.name,
    loanAmount: parsed.data.loanAmount,
    tenureMonths: parsed.data.tenureMonths,
    monthlyEmi: parsed.data.monthlyEmi,
    status: "pending",
    agentStage: "sales",
    applicantName: user.name,
    applicantEmail: user.email,
    applicantPhone: user.phone,
    annualIncome: parsed.data.annualIncome,
    employmentType: parsed.data.employmentType,
  }).returning();

  res.status(201).json(application);
});

router.get("/applications/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  const [application] = await db
    .select()
    .from(loanApplicationsTable)
    .where(and(eq(loanApplicationsTable.id, id), eq(loanApplicationsTable.userId, req.userId!)));

  if (!application) {
    res.status(404).json({ message: "Application not found" });
    return;
  }
  res.json(application);
});

router.patch("/applications/:id/status", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params["id"] ?? "0");
  const parsed = UpdateApplicationStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    updatedAt: new Date(),
  };
  if (parsed.data.agentStage !== undefined) updates["agentStage"] = parsed.data.agentStage;
  if (parsed.data.remarks !== undefined) updates["remarks"] = parsed.data.remarks;
  if (parsed.data.lockingId !== undefined) updates["lockingId"] = parsed.data.lockingId;

  const [updated] = await db
    .update(loanApplicationsTable)
    .set(updates)
    .where(eq(loanApplicationsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Application not found" });
    return;
  }
  res.json(updated);
});

router.get("/admin/applications", requireAuth, async (_req, res) => {
  const applications = await db.select().from(loanApplicationsTable);
  res.json(applications);
});

router.post("/admin/loans", requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }

  const parsed = CreateLoanProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const [loan] = await db.insert(loanProductsTable).values(parsed.data).returning();
  res.status(201).json(loan);
});

router.put("/admin/loans/:id", requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }

  const id = parseInt(req.params["id"] ?? "0");
  const parsed = CreateLoanProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const [updated] = await db
    .update(loanProductsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(loanProductsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ message: "Loan product not found" });
    return;
  }
  res.json(updated);
});

router.delete("/admin/loans/:id", requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }

  const id = parseInt(req.params["id"] ?? "0");
  await db.delete(loanProductsTable).where(eq(loanProductsTable.id, id));
  res.json({ message: "Loan product deleted", success: true });
});

export default router;
