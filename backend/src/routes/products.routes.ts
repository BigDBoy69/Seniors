import { Router } from "express";
import {
  listProducts,
  getProduct,
  listCategories,
  adminListProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  unarchiveProduct,
  deleteProduct,
} from "../controllers/products.controller";

export const productRouter = Router();
export const productAdminRouter = Router();

// Public
productRouter.get("/", listProducts);
productRouter.get("/categories", listCategories);
productRouter.get("/:slug", getProduct);

// Admin
productAdminRouter.get("/", adminListProducts);
productAdminRouter.post("/", createProduct);
productAdminRouter.patch("/:id", updateProduct);
productAdminRouter.delete("/:id", archiveProduct);
productAdminRouter.post("/:id/unarchive", unarchiveProduct);
productAdminRouter.delete("/:id/hard", deleteProduct);
