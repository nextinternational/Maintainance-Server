// controllers/restaurant.controller.ts — same shape, swap Location → Restaurant
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler.js";
import {
  fetchAllRestaurants,
  createRestaurantService,
  updateRestaurantService,
  deleteRestaurantService,
} from "../services/restaurant.service.js";

export const getAllRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAllRestaurants();
    res.status(200).json({ success: true, total: data.length, data });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const createRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const data = await createRestaurantService(name);
    res.status(201).json({ success: true, message: "Restaurant created", data });
  } catch (error: any) {
    if (error.code === 11000)
      return res.status(409).json({ success: false, message: "Restaurant already exists" });
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const updateRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    const updated = await updateRestaurantService(id, req.body.name);
    if (!updated) return res.status(404).json({ success: false, message: "Restaurant not found" });
    res.status(200).json({ success: true, message: "Restaurant updated", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const deleteRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    const deleted = await deleteRestaurantService(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Restaurant not found" });
    res.status(200).json({ success: true, message: "Restaurant deleted" });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};