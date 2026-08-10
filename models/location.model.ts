// models/location.model.ts
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

export interface ILocation {
  id: number;
  name: string;
  active?: boolean;
}
export interface ILocationDocument extends Omit<Document, "model">, ILocation {}

const locationSchema = new Schema<ILocationDocument>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

locationSchema.pre("save", async function () {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence("location");
  }
});

const LocationModel: Model<ILocationDocument> =
  mongoose.models.Location || mongoose.model<ILocationDocument>("Location", locationSchema);

export default LocationModel;