// routes/location.routes.ts
import { Router } from "express";
import { getAllLocations, createLocation, updateLocation, deleteLocation } from "../controllers/location.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";
import { refreshTokenMiddleware } from "../controllers/user.controller.js";

const locationRouter = Router();
locationRouter.get("/get-all-locations", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), getAllLocations);
locationRouter.post("/create-location", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), createLocation);
locationRouter.put("/update-location/:id", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), updateLocation);
locationRouter.delete("/delete-location/:id", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), deleteLocation);
export default locationRouter;