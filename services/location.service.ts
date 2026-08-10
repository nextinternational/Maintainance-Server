// services/location.service.ts
import LocationModel from "../models/location.model.js";

export async function fetchAllLocations() {
  return LocationModel.find({ active: true }).sort({ name: 1 }).lean();
}
export async function createLocationService(name: string) {
  const doc = await LocationModel.create({ name });
  return doc.toObject();
}
export async function updateLocationService(id: number, name: string) {
  return LocationModel.findOneAndUpdate({ id }, { $set: { name } }, { new: true, runValidators: true });
}
export async function deleteLocationService(id: number) {
  return LocationModel.findOneAndUpdate({ id }, { $set: { active: false } }, { new: true });
}