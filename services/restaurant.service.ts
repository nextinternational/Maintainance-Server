// services/restaurant.service.ts
import RestaurantModel from "../models/restaurant.model.js";

export async function fetchAllRestaurants() {
  return RestaurantModel.find({ active: true }).sort({ name: 1 }).lean();
}
export async function createRestaurantService(name: string) {
  const doc = await RestaurantModel.create({ name });
  return doc.toObject();
}
export async function updateRestaurantService(id: number, name: string) {
  return RestaurantModel.findOneAndUpdate({ id }, { $set: { name } }, { new: true, runValidators: true });
}
export async function deleteRestaurantService(id: number) {
  return RestaurantModel.findOneAndUpdate({ id }, { $set: { active: false } }, { new: true });
}