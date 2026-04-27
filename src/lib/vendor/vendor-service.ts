import {
  type VendorRecord,
  type VendorRepository,
} from "#/lib/vendor/vendor-repository";

export type CreateVendorInput = {
  vendor_name: string;
  house_number: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
};

export type CreateVendorResult = VendorRecord & {
  created: boolean;
};

export class VendorService {
  constructor(private readonly repository: VendorRepository) {}

  async createVendor(input: CreateVendorInput): Promise<CreateVendorResult> {
    const normalized = this.validateAndNormalize(input);
    const existing = await this.repository.findByName(normalized.vendor_name);

    if (existing) {
      return {
        ...existing,
        created: false,
      };
    }

    const created = await this.repository.create({
      vendor_name: normalized.vendor_name,
      vendor_address: normalized.vendor_address,
    });

    return {
      ...created,
      created: true,
    };
  }

  async listVendors(): Promise<VendorRecord[]> {
    return await this.repository.list();
  }

  private validateAndNormalize(input: CreateVendorInput): {
    vendor_name: string;
    vendor_address: string;
  } {
    const vendorName = input.vendor_name.trim();
    const houseNumber = input.house_number.trim();
    const street = input.street.trim();
    const city = input.city.trim();
    const state = input.state.trim();
    const postalCode = input.postal_code.trim();

    if (!vendorName) {
      throw new Error("Vendor name is required.");
    }

    if (!houseNumber || !street || !city || !state || !postalCode) {
      throw new Error("Complete address is required.");
    }

    return {
      vendor_name: vendorName,
      vendor_address: `${houseNumber} ${street}, ${city}, ${state} ${postalCode}`,
    };
  }
}
