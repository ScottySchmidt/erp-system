import { eq, sql } from "drizzle-orm";

import { t, type DrizzleClient } from "#/lib/server/database";

type InvoiceInsertValues = typeof t.invoices.$inferInsert;
type InvoiceRow = typeof t.invoices.$inferSelect;

function appendMessage(messages: string[], value: unknown) {
  if (typeof value === "string" && value.trim()) {
    messages.push(value.trim());
  }
}

function collectErrorMessages(error: unknown): string[] {
  const messages: string[] = [];
  const visited = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (typeof current === "string") {
      appendMessage(messages, current);
      continue;
    }

    if (current instanceof Error) {
      appendMessage(messages, current.message);
      const errorWithCause = current as Error & { cause?: unknown };
      if (errorWithCause.cause) {
        queue.push(errorWithCause.cause);
      }
    }

    if (typeof current === "object") {
      const record = current as {
        message?: unknown;
        detail?: unknown;
        hint?: unknown;
        code?: unknown;
        cause?: unknown;
        column?: unknown;
        constraint?: unknown;
        table?: unknown;
      };
      appendMessage(messages, record.message);
      appendMessage(messages, record.detail);
      appendMessage(messages, record.hint);
      appendMessage(messages, record.code);
      appendMessage(messages, record.column);
      appendMessage(messages, record.constraint);
      appendMessage(messages, record.table);
      if (record.cause) {
        queue.push(record.cause);
      }
    }
  }

  return messages;
}

export function getDatabaseErrorReason(error: unknown) {
  const messages = collectErrorMessages(error);
  if (!messages.length) {
    return "Unknown database error";
  }

  return Array.from(new Set(messages)).join(" | ");
}

function shouldRetryWithManualInvoiceId(reason: string) {
  const normalized = reason.toLowerCase();
  if (!normalized.includes("invoice_id")) {
    return false;
  }

  const missingDefaultOrIdentity =
    normalized.includes("null value") ||
    normalized.includes("not-null constraint") ||
    normalized.includes("no default") ||
    normalized.includes("default value") ||
    normalized.includes("identity");

  if (missingDefaultOrIdentity) {
    return true;
  }

  // Handle sequence drift where DEFAULT emits an existing invoice_id value.
  return (
    normalized.includes("duplicate key") ||
    normalized.includes("already exists") ||
    normalized.includes("unique constraint") ||
    normalized.includes("23505")
  );
}

export async function assertInvoiceReferencesExist(
  db: DrizzleClient,
  values: Pick<InvoiceInsertValues, "user_id" | "account_id" | "vendor_id">,
) {
  const vendorLookupPromise =
    values.vendor_id == null
      ? Promise.resolve(undefined)
      : db
          .select({ vendor_id: t.vendor.vendor_id })
          .from(t.vendor)
          .where(eq(t.vendor.vendor_id, values.vendor_id))
          .limit(1)
          .then((rows) => rows[0]);

  const [userExists, accountExists, vendorExists] = await Promise.all([
    db
      .select({ user_id: t.users.user_id })
      .from(t.users)
      .where(eq(t.users.user_id, values.user_id))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ account_id: t.gl_accounts.account_id })
      .from(t.gl_accounts)
      .where(eq(t.gl_accounts.account_id, values.account_id))
      .limit(1)
      .then((rows) => rows[0]),
    vendorLookupPromise,
  ]);

  if (!userExists) {
    throw new Error(
      `Invoice debug: authenticated user_id ${values.user_id} does not exist in users table.`,
    );
  }

  if (!accountExists) {
    throw new Error(
      `Invoice debug: account_id ${values.account_id} was not found in gl_accounts.`,
    );
  }

  if (values.vendor_id != null && !vendorExists) {
    throw new Error(
      `Invoice debug: vendor_id ${values.vendor_id} was not found in vendor table.`,
    );
  }
}

async function runInsert(db: DrizzleClient, values: InvoiceInsertValues) {
  return await db
    .insert(t.invoices)
    .values(values)
    .returning()
    .then((rows) => rows[0] as InvoiceRow | undefined);
}

export async function insertInvoiceWithInvoiceIdFallback(
  db: DrizzleClient,
  values: InvoiceInsertValues,
) {
  try {
    return await runInsert(db, values);
  } catch (error) {
    const reason = getDatabaseErrorReason(error);
    if (!shouldRetryWithManualInvoiceId(reason)) {
      throw error;
    }

    const nextInvoiceId = await db
      .select({
        invoice_id: sql<number>`coalesce(max(${t.invoices.invoice_id}), 0) + 1`,
      })
      .from(t.invoices)
      .then((rows) => rows[0]?.invoice_id);

    if (!nextInvoiceId) {
      throw error;
    }

    return await runInsert(db, {
      ...values,
      invoice_id: nextInvoiceId,
    });
  }
}
