import { pgTable, serial, text, real, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const loanProductsTable = pgTable("loan_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  minAmount: real("min_amount").notNull(),
  maxAmount: real("max_amount").notNull(),
  minTenureMonths: integer("min_tenure_months").notNull(),
  maxTenureMonths: integer("max_tenure_months").notNull(),
  baseInterestRate: real("base_interest_rate").notNull(),
  processingFeePercent: real("processing_fee_percent").notNull(),
  eligibilityCriteria: jsonb("eligibility_criteria").$type<string[]>().notNull().default([]),
  documentsRequired: jsonb("documents_required").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLoanProductSchema = createInsertSchema(loanProductsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLoanProduct = z.infer<typeof insertLoanProductSchema>;
export type LoanProduct = typeof loanProductsTable.$inferSelect;
