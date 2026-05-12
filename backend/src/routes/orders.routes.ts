import { Router } from "express";
import {
  createOrder,
  getOrder,
  adminListOrders,
  adminGetOrder,
  updateOrderStatus,
  adminDashboardStats,
  syncOrdersToUsers,
} from "../controllers/orders.controller";
import { orderLookupRateLimit } from "../middleware/security";

export const orderRouter = Router();
export const orderAdminRouter = Router();

// Public
orderRouter.post("/", createOrder);
orderRouter.get("/:id", orderLookupRateLimit, getOrder);

// Admin
orderAdminRouter.get("/dashboard", adminDashboardStats);
orderAdminRouter.get("/", adminListOrders);
orderAdminRouter.get("/:id", adminGetOrder);
orderAdminRouter.patch("/:id/status", updateOrderStatus);
orderAdminRouter.post("/sync-users", syncOrdersToUsers); // Sync existing orders to user accounts
