import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler.js";
import {
  fetchAllVendors,
  createVendorService,
  updateVendorService,
  deleteVendorService,
} from "../services/vendor.service.js";

export const getAllVendors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await fetchAllVendors();
    res.status(200).json({ success: true, total: data.length, data });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, contactName, phone, email, address, website, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const data = await createVendorService({ name, contactName, phone, email, address, website, notes });
    res.status(201).json({ success: true, message: "Vendor created", data });
  } catch (error: any) {
    if (error.code === 11000)
      return res.status(409).json({ success: false, message: "Vendor already exists" });
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const { name, contactName, phone, email, address, website, notes } = req.body;
    const updated = await updateVendorService(id, { name, contactName, phone, email, address, website, notes });
    if (!updated) return res.status(404).json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, message: "Vendor updated", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const deleted = await deleteVendorService(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, message: "Vendor deleted" });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};