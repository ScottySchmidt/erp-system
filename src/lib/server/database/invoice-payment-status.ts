import { sql } from "drizzle-orm";

import { type DrizzleClient } from "#/lib/server/database";

type SqlExecutor = Pick<DrizzleClient, "execute">;
const BUSINESS_TIME_ZONE = "America/Chicago";

export async function syncInvoicePaidStatusByPaymentDate(
  db: SqlExecutor,
  userId: number,
) {
  await db.execute(sql`
    update invoices as i
    set is_paid = exists (
      select 1
      from payment_invoice as pi
      inner join payment as p on p.payment_id = pi.payment_id
      where pi.invoice_id = i.invoice_id
        and p.user_id = ${userId}
        and p.payment_date <= (now() at time zone ${BUSINESS_TIME_ZONE})::date
    )
    where i.user_id = ${userId}
  `);
}
