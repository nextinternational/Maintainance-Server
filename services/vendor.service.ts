import VendorModel from "../models/vendor.model.js";

export interface VendorInput {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  notes?: string | null;
}

export async function fetchAllVendors() {
  return VendorModel.find({ active: true }).sort({ name: 1 }).lean();
}

export async function createVendorService(input: VendorInput) {
  const doc = await VendorModel.create({
    name: input.name,
    contactName: input.contactName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    website: input.website ?? null,
    notes: input.notes ?? null,
  });
  return doc.toObject();
}

export async function updateVendorService(id: number, data: Partial<VendorInput>) {
  return VendorModel.findOneAndUpdate({ id }, { $set: data }, { new: true, runValidators: true });
}

export async function deleteVendorService(id: number) {
  return VendorModel.findOneAndUpdate({ id }, { $set: { active: false } }, { new: true });
}