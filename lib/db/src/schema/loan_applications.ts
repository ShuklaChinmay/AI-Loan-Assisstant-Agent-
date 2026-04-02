import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { loanProductsTable } from "./loan_products";

export const loanApplicationsTable = pgTable("loan_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  loanProductId: integer("loan_product_id").notNull().references(() => loanProductsTable.id),
  loanProductName: text("loan_product_name").notNull(),
  loanAmount: real("loan_amount").notNull(),
  tenureMonths: integer("tenure_months").notNull(),
  monthlyEmi: real("monthly_emi").notNull(),
  status: text("status").notNull().default("pending"),
  agentStage: text("agent_stage"),
  lockingId: text("locking_id"),
  creditScore: integer("credit_score"),
  remarks: text("remarks"),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  applicantPhone: text("applicant_phone").notNull(),
  annualIncome: real("annual_income"),
  employmentType: text("employment_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLoanApplicationSchema = createInsertSchema(loanApplicationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLoanApplication = z.infer<typeof insertLoanApplicationSchema>;
export type LoanApplication = typeof loanApplicationsTable.$inferSelect;
