import {
  pgTable,
  bigint,
  text,
  varchar,
  date,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";

export const enum_pay_type = pgEnum("pay_type", ["cash", "check", "credit_card"]);
export const enum_status = pgEnum("status", ["draft", "sent", "paid", "overdue"]);

export const payment = pgTable("payment", {
  payment_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  invoice_id: bigint({ mode: "number" }).notNull(),
  pay_type: enum_pay_type(),
});

export const departments = pgTable("departments", {
  dept_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  dept_name: text().notNull(),
});

export const vendor = pgTable("vendor", {
  vendor_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  vendor_name: text().notNull(),
  vendor_address: text(),
});

export const roles = pgTable("roles", {
  role_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  role_name: varchar({ length: 50 }).notNull(),
});

export const invoices = pgTable("invoices", {
  invoice_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: bigint({ mode: "number" }).notNull(),
  account_id: bigint({ mode: "number" }).notNull(),
  invoice_date: date().notNull(),
  amount: numeric({ precision: 12, scale: 2 }).notNull(),
  vendor_id: bigint({ mode: "number" }),
  created_date: date(),
});

export const gl_accounts = pgTable("gl_accounts", {
  account_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  account_name: varchar({ length: 100 }).notNull(),
  account_type: varchar({ length: 20 }).notNull(),
  is_active: boolean().default(true).notNull(),
});

export const users = pgTable("users", {
  user_id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  auth_id: uuid().notNull(),
  created_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
  role_id: bigint({ mode: "number" }),
  dept_id: bigint({ mode: "number" }),
  email: text().notNull(),
  full_name: text().notNull(),
});
