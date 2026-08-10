// controllers/location.controller.ts
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler.js";
import {
  fetchAllLocations,
  createLocationService,
  updateLocationService,
  deleteLocationService,
} from "../services/location.service.js";

export const getAllLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAllLocations();
    res.status(200).json({ success: true, total: data.length, data });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const createLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });
    const data = await createLocationService(name);
    res.status(201).json({ success: true, message: "Location created", data });
  } catch (error: any) {
    if (error.code === 11000)
      return res.status(409).json({ success: false, message: "Location already exists" });
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const updateLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    const updated = await updateLocationService(id, req.body.name);
    if (!updated) return res.status(404).json({ success: false, message: "Location not found" });
    res.status(200).json({ success: true, message: "Location updated", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const deleteLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
    const deleted = await deleteLocationService(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Location not found" });
    res.status(200).json({ success: true, message: "Location deleted" });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};