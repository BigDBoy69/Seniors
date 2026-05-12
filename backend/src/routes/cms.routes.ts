import { Router } from "express";
import {
  adminDashboardOverview,
  createAdminUser,
  createCategory,
  createCollection,
  createDivision,
  createMedia,
  deleteCategory,
  deleteCollection,
  deleteDivision,
  deleteHomepageSection,
  deleteMedia,
  getCatalogDivision,
  getCategoryProductCount,
  getHomepageContent,
  getSiteSettings,
  getStorefrontConfig,
  listAdminUsers,
  listCategoriesAdmin,
  listCollections,
  listCustomers,
  listDivisions,
  listMedia,
  listNavigation,
  updateAdminUser,
  updateCategory,
  updateCollection,
  updateDivision,
  updateHomepageContent,
  updateSiteSettings,
  upsertHomepageSection,
  upsertNavigationItems,
} from "../controllers/cms.controller";
import { requireRole } from "../middleware/auth";

export const siteRouter = Router();
export const cmsAdminRouter = Router();

siteRouter.get("/config", getStorefrontConfig);
siteRouter.get("/divisions/:key", getCatalogDivision);
siteRouter.get("/collections", listCollections);

cmsAdminRouter.get("/dashboard", adminDashboardOverview);

cmsAdminRouter.get("/divisions", listDivisions);
cmsAdminRouter.post("/divisions", createDivision);
cmsAdminRouter.patch("/divisions/:id", updateDivision);
cmsAdminRouter.delete("/divisions/:id", deleteDivision);

cmsAdminRouter.get("/categories", listCategoriesAdmin);
cmsAdminRouter.post("/categories", createCategory);
cmsAdminRouter.patch("/categories/:id", updateCategory);
cmsAdminRouter.delete("/categories/:id", deleteCategory);
cmsAdminRouter.get("/categories/:id/products-count", getCategoryProductCount);

cmsAdminRouter.get("/collections", listCollections);
cmsAdminRouter.post("/collections", createCollection);
cmsAdminRouter.patch("/collections/:id", updateCollection);
cmsAdminRouter.delete("/collections/:id", deleteCollection);

cmsAdminRouter.get("/homepage", getHomepageContent);
cmsAdminRouter.patch("/homepage", updateHomepageContent);
cmsAdminRouter.post("/homepage/sections", upsertHomepageSection);
cmsAdminRouter.delete("/homepage/sections/:id", deleteHomepageSection);

cmsAdminRouter.get("/navigation", listNavigation);
cmsAdminRouter.put("/navigation", upsertNavigationItems);

cmsAdminRouter.get("/settings", getSiteSettings);
cmsAdminRouter.patch("/settings", updateSiteSettings);

cmsAdminRouter.get("/media", listMedia);
cmsAdminRouter.post("/media", createMedia);
cmsAdminRouter.delete("/media/:id", deleteMedia);

cmsAdminRouter.get("/customers", listCustomers);
// Admin user management — restricted to ADMIN role only to prevent privilege escalation
cmsAdminRouter.get("/admins", requireRole("ADMIN"), listAdminUsers);
cmsAdminRouter.post("/admins", requireRole("ADMIN"), createAdminUser);
cmsAdminRouter.patch("/admins/:id", requireRole("ADMIN"), updateAdminUser);
