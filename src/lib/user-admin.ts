import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import * as v from "valibot";

import { MustAuthenticate } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

export const DeleteUserSchema = v.object({
  userId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  password: v.pipe(v.string(), v.nonEmpty("Admin password is required.")),
  confirmationSentence: v.pipe(v.string(), v.nonEmpty("Confirmation sentence is required.")),
});

export const deleteUserByAdminFn = createServerFn({ method: "POST" })
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(DeleteUserSchema)
  .handler(async ({ context, data }) => {
    if (context.auth.profile.role_id !== 1) {
      throw new Error("Only administrators can delete users.");
    }

    if (context.auth.profile.user_id === data.userId) {
      throw new Error("You cannot delete your own admin account.");
    }

    const configuredPassword =
      env?.ADMIN_ACCESS_PASSWORD ??
      process.env.ADMIN_ACCESS_PASSWORD ??
      env?.ADMIN_CREATE_SECRET ??
      process.env.ADMIN_CREATE_SECRET ??
      "";

    if (!configuredPassword.trim()) {
      throw new Error(
        "Administration access is not configured. Set ADMIN_ACCESS_PASSWORD on the server.",
      );
    }

    if (data.password.trim() !== configuredPassword.trim()) {
      throw new Error("Incorrect administration password.");
    }

    const targetUser = await context.db
      .select({
        user_id: t.users.user_id,
        auth_id: t.users.auth_id,
        full_name: t.users.full_name,
      })
      .from(t.users)
      .where(eq(t.users.user_id, data.userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!targetUser) {
      throw new Error("User not found.");
    }

    const expectedSentence = `DELETE USER ${targetUser.user_id}`;
    if (data.confirmationSentence.trim() !== expectedSentence) {
      throw new Error(`Confirmation sentence mismatch. Please type "${expectedSentence}".`);
    }

    await context.db.transaction(async (tx: any) => {
      await tx.execute(sql`
        delete from payment_invoice pi
        using payment p
        where pi.payment_id = p.payment_id
          and p.user_id = ${targetUser.user_id}
      `);

      await tx.execute(sql`
        delete from invoice_items ii
        using invoices i
        where ii.invoice_id = i.invoice_id
          and i.user_id = ${targetUser.user_id}
      `);

      await tx.delete(t.payment).where(eq(t.payment.user_id, targetUser.user_id));
      await tx.delete(t.invoices).where(eq(t.invoices.user_id, targetUser.user_id));
      await tx.delete(t.users).where(eq(t.users.user_id, targetUser.user_id));
    });

    const adminClient = getSupabaseAdminClient();
    const authDeleteResult = await adminClient.auth.admin.deleteUser(targetUser.auth_id);
    if (authDeleteResult.error) {
      throw new Error(
        `User row deleted but failed to delete auth user: ${authDeleteResult.error.message}`,
      );
    }

    return {
      deletedUserId: targetUser.user_id,
      deletedFullName: targetUser.full_name,
    };
  });

function getSupabaseAdminClient() {
  const workerEnv = env as unknown as Record<string, string | undefined> | undefined;
  const supabaseUrl = workerEnv?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceRoleKey =
    workerEnv?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl.trim()) {
    throw new Error("Missing SUPABASE_URL on server.");
  }

  if (!serviceRoleKey.trim()) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY on server.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
