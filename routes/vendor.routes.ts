import { Router } from "express";
import { getAllVendors, createVendor, updateVendor, deleteVendor } from "../controllers/vendor.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";
import { refreshTokenMiddleware } from "../controllers/user.controller.js";

const vendorRouter = Router();

vendorRouter.get("/get-all-vendors", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser", "manager"), getAllVendors);
vendorRouter.post("/create-vendor", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser", "manager"), createVendor);
vendorRouter.put("/update-vendor/:id", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser", "manager"), updateVendor);
vendorRouter.delete("/delete-vendor/:id", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser", "manager"), deleteVendor);

export default vendorRouter;