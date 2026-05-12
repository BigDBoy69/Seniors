import { Router } from "express";
import { submitContact, getContactMessages } from "../controllers/contact.controller";
import { requireAuth } from "../middleware/auth";

export const contactRouter = Router();

// Public endpoint - anyone can submit contact form
contactRouter.post("/", submitContact);

// Admin endpoint - requires authentication
contactRouter.get("/", requireAuth, getContactMessages);
