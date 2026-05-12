import { Router } from "express";
import { login, getCurrentAdmin } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", requireAuth, getCurrentAdmin);
