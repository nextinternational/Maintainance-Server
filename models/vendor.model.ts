import mongoose, { Document, Model, Schema } from "mongoose";

interface ICounter extends Omit<Document, "_id"> {
  _id: string;
  seq: number;
}
const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const CounterModel: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", counterSchema);

async function getNextSequence(name: string): Promise<number> {
  const counter = await CounterModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}

export interface IVendor {
  id: number;
  name: string;              // company name
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  active?: boolean;
}
export interface IVendorDocument extends Omit<Document, "model">, IVendor {}

const vendorSchema = new Schema<IVendorDocument>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, unique: true },
    contactName: { type: String, default: null },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    address: { type: String, default: null },
    website: { type: String, default: null },
    notes: { type: String, default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

vendorSchema.pre("save", async function () {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence("vendor");
  }
});

const VendorModel: Model<IVendorDocument> =
  mongoose.models.Vendor || mongoose.model<IVendorDocument>("Vendor", vendorSchema);

export default VendorModel;