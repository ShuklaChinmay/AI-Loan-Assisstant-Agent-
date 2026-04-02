import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, loanApplicationsTable, loanProductsTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireAdmin, requireAuth, type AuthRequest } from "../lib/auth-middleware.js";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (_req: AuthRequest, res) => {
  const users = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    phone: usersTable.phone,
    role: usersTable.role,
    kycCompleted: usersTable.kycCompleted,
    creditScore: usersTable.creditScore,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

router.get("/dashboard/summary", requireAdmin, async (_req: AuthRequest, res) => {
  const allApps = await db.select({
    id: loanApplicationsTable.id,
    status: loanApplicationsTable.status,
    loanAmount: loanApplicationsTable.loanAmount,
    createdAt: loanApplicationsTable.createdAt,
    applicantId: loanApplicationsTable.applicantId,
    loanProductId: loanApplicationsTable.loanProductId,
  }).from(loanApplicationsTable);

  const totalApplications = allApps.length;
  const pendingStatuses = new Set(["pending", "kyc_review", "document_review", "underwriting"]);
  const approvedStatuses = new Set(["sanctioned", "locked", "disbursed"]);

  const pendingApplications = allApps.filter(a => pendingStatuses.has(a.status)).length;
  const approvedApplications = allApps.filter(a => approvedStatuses.has(a.status)).length;
  const rejectedApplications = allApps.filter(a => a.status === "rejected").length;
  const totalLoanAmount = allApps.reduce((sum, a) => sum + (a.loanAmount || 0), 0);

  const users = await db.select({ id: usersTable.id }).from(usersTable);
  const totalUsers = users.length;

  const recentApps = await db.select({
    id: loanApplicationsTable.id,
    status: loanApplicationsTable.status,
    loanAmount: loanApplicationsTable.loanAmount,
    createdAt: loanApplicationsTable.createdAt,
    applicantId: loanApplicationsTable.applicantId,
    loanProductId: loanApplicationsTable.loanProductId,
  })
    .from(loanApplicationsTable)
    .orderBy(desc(loanApplicationsTable.createdAt))
    .limit(5);

  const recentWithDetails = await Promise.all(recentApps.map(async (app) => {
    const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, app.applicantId));
    const [product] = await db.select({ name: loanProductsTable.name }).from(loanProductsTable).where(eq(loanProductsTable.id, app.loanProductId));
    return {
      ...app,
      applicantName: user?.name ?? "Unknown",
      loanProductName: product?.name ?? "Unknown",
    };
  }));

  const statusCounts: Record<string, number> = {};
  allApps.forEach(a => {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  });
  const applicationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  res.json({
    totalApplications,
    pendingApplications,
    approvedApplications,
    rejectedApplications,
    totalLoanAmount,
    totalUsers,
    recentApplications: recentWithDetails,
    applicationsByStatus,
  });
});

export default router;
