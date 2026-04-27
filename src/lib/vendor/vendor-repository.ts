import { desc, eq } from "drizzle-orm";

import { t, type DrizzleClient } from "#/lib/server/database";

export type VendorRecord = {
  vendor_id: number;
  vendor_name: string;
  vendor_address: string | null;
};

export interface VendorRepository {
  findByName(name: string): Promise<VendorRecord | null>;
  create(input: { vendor_name: string; vendor_address: string }): Promise<VendorRecord>;
  list(): Promise<VendorRecord[]>;
}

export class DrizzleVendorRepository implements VendorRepository {
  constructor(private readonly db: DrizzleClient) {}

  async findByName(name: string): Promise<VendorRecord | null> {
    const row = await this.db
      .select({
        vendor_id: t.vendor.vendor_id,
        vendor_name: t.vendor.vendor_name,
        vendor_address: t.vendor.vendor_address,
      })
      .from(t.vendor)
      .where(eq(t.vendor.vendor_name, name))
      .limit(1)
      .then((rows) => rows[0]);

    return row ?? null;
  }

  async create(input: { vendor_name: string; vendor_address: string }): Promise<VendorRecord> {
    const inserted = await this.db
      .insert(t.vendor)
      .values({
        vendor_name: input.vendor_name,
        vendor_address: input.vendor_address,
      })
      .returning({
        vendor_id: t.vendor.vendor_id,
        vendor_name: t.vendor.vendor_name,
        vendor_address: t.vendor.vendor_address,
      })
      .then((rows) => rows[0]);

    if (!inserted) {
      throw new Error("Failed to create vendor");
    }

    return inserted;
  }

  async list(): Promise<VendorRecord[]> {
    return await this.db
      .select({
        vendor_id: t.vendor.vendor_id,
        vendor_name: t.vendor.vendor_name,
        vendor_address: t.vendor.vendor_address,
      })
      .from(t.vendor)
      .orderBy(desc(t.vendor.vendor_id));
  }
}
