import { Router } from "express";
import {
  getProfile,
  updateProfile,
  requestPasswordChange,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getOrders,
  getOrderById,
} from "../controllers/account.controller";

export const accountRouter = Router();

// Profile
accountRouter.get("/profile", getProfile);
accountRouter.put("/profile", updateProfile);
accountRouter.post("/profile/password", requestPasswordChange);

// Addresses
accountRouter.get("/addresses", getAddresses);
accountRouter.post("/addresses", createAddress);
accountRouter.put("/addresses/:id", updateAddress);
accountRouter.delete("/addresses/:id", deleteAddress);

// Wishlist
accountRouter.get("/wishlist", getWishlist);
accountRouter.post("/wishlist", addToWishlist);
accountRouter.delete("/wishlist/:id", removeFromWishlist);

// Orders
accountRouter.get("/orders", getOrders);
accountRouter.get("/orders/:id", getOrderById);
