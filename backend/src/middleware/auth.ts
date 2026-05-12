import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  admin?: {
    adminId: string;
    email: string;
    role: string;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Confirm the admin account still exists and is active — prevents deactivated admins
    // from continuing to use an unexpired JWT.
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: { active: true },
    });
    if (!admin || !admin.active) {
      res.status(401).json({ error: "Account is no longer active" });
      return;
    }

    req.admin = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.admin.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
