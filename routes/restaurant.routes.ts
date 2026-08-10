// routes/restaurant.routes.ts
import { Router } from "express";
import { getAllRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "../controllers/restaurant.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";
import { refreshTokenMiddleware } from "../controllers/user.controller.js";

const restaurantRouter = Router();
restaurantRouter.get("/get-all-restaurants", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), getAllRestaurants);
restaurantRouter.post("/create-restaurant", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), createRestaurant);
restaurantRouter.put("/update-restaurant/:id", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), updateRestaurant);
restaurantRouter.delete("/delete-restaurant/:id", refreshTokenMiddleware, isAuthenticated, authorizeRoles("Enduser","manager"), deleteRestaurant);
export default restaurantRouter;