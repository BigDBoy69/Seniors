import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateAdmin } from "../services/auth.service";
import { AuthRequest } from "../middleware/auth";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const userAgent = req.headers['user-agent'];
    const result = await authenticateAdmin(email, password, ip, userAgent);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid credentials")) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (err instanceof Error && err.message.includes("locked")) {
      res.status(423).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.message.includes("disabled")) {
      res.status(403).json({ error: "Account is disabled" });
      return;
    }
    next(err);
  }
}

export async function getCurrentAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.admin) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    res.json({ admin: req.admin });
  } catch (err) {
    next(err);
  }
}
