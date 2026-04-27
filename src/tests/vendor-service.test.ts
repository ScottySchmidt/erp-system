import { describe, expect, it } from "vitest";

import {
  type VendorRecord,
  type VendorRepository,
} from "#/lib/vendor/vendor-repository";
import { VendorService } from "#/lib/vendor/vendor-service";

class FakeVendorRepository implements VendorRepository {
  private readonly byName = new Map<string, VendorRecord>();
  private nextId = 100;

  constructor(seedVendors: VendorRecord[] = []) {
    seedVendors.forEach((vendor) => {
      this.byName.set(vendor.vendor_name, vendor);
      this.nextId = Math.max(this.nextId, vendor.vendor_id + 1);
    });
  }

  async findByName(name: string): Promise<VendorRecord | null> {
    return this.byName.get(name) ?? null;
  }

  async create(input: { vendor_name: string; vendor_address: string }): Promise<VendorRecord> {
    const row: VendorRecord = {
      vendor_id: this.nextId++,
      vendor_name: input.vendor_name,
      vendor_address: input.vendor_address,
    };
    this.byName.set(row.vendor_name, row);
    return row;
  }

  async list(): Promise<VendorRecord[]> {
    return Array.from(this.byName.values());
  }
}

describe("VendorService", () => {
  it("creates a vendor with normalized address", async () => {
    const repository = new FakeVendorRepository();
    const service = new VendorService(repository);

    const result = await service.createVendor({
      vendor_name: "Acme Corp",
      house_number: "123",
      street: "Main St",
      city: "Austin",
      state: "TX",
      postal_code: "73301",
    });

    expect(result.created).toBe(true);
    expect(result.vendor_name).toBe("Acme Corp");
    expect(result.vendor_address).toBe("123 Main St, Austin, TX 73301");
  });

  it("returns existing vendor when name already exists", async () => {
    const repository = new FakeVendorRepository([
      {
        vendor_id: 5,
        vendor_name: "Acme Corp",
        vendor_address: "10 Existing St, Austin, TX 73301",
      },
    ]);
    const service = new VendorService(repository);

    const result = await service.createVendor({
      vendor_name: "Acme Corp",
      house_number: "123",
      street: "Main St",
      city: "Austin",
      state: "TX",
      postal_code: "73301",
    });

    expect(result.created).toBe(false);
    expect(result.vendor_id).toBe(5);
    expect(result.vendor_address).toBe("10 Existing St, Austin, TX 73301");
  });

  it("throws validation error when vendor name is blank", async () => {
    const repository = new FakeVendorRepository();
    const service = new VendorService(repository);

    await expect(
      service.createVendor({
        vendor_name: "   ",
        house_number: "123",
        street: "Main St",
        city: "Austin",
        state: "TX",
        postal_code: "73301",
      }),
    ).rejects.toThrow("Vendor name is required.");
  });
});
