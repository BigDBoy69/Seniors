import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  createUser,
  authenticateUser,
  getUserById,
  verifyUserToken,
  validatePasswordStrength,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  deleteUserAccount,
  requestAccountDeletion,
  confirmAccountDeletion,
} from "../services/userAuth.service";

const signupSchema = z.object({
  email: z.string().email().max(254).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1).max(128),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(254).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

export interface UserAuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const data = signupSchema.parse(req.body);

    // Validate password strength before hashing
    const pwCheck = validatePasswordStrength(data.password);
    if (!pwCheck.valid) {
      res.status(400).json({ error: pwCheck.message });
      return;
    }

    const result = await createUser(data.email, data.password, data.firstName, data.lastName, data.phone);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      // In production, return 201 to prevent email enumeration
      if (process.env.NODE_ENV === "production") {
        res.status(201).json({ token: null, user: null });
      } else {
        res.status(409).json({ error: "Email already registered" });
      }
      return;
    }
    if (err instanceof Error && (err.message.includes("domain does not") || err.message.includes("invalid or the domain"))) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
    const userAgent = req.headers['user-agent'];
    const result = await authenticateUser(email, password, ip, userAgent);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'email_not_verified') {
      res.status(403).json({ error: 'Please verify your email before logging in.', emailNotVerified: true });
      return;
    }
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

export async function getMe(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await getUserById(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function requireUserAuth(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyUserToken(token);

    // Invalidate tokens issued before the user's last password change (Fix 4c)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { active: true, passwordChangedAt: true },
    });

    if (!user || !user.active) {
      res.status(401).json({ error: "Account not found or disabled" });
      return;
    }

    if (user.passwordChangedAt && payload.iat !== undefined) {
      const changedAtUnix = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (payload.iat < changedAtUnix) {
        res.status(401).json({ error: "Session expired. Please log in again." });
        return;
      }
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function verifyEmailEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.query);
    const result = await verifyEmail(token);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (err) {
    next(err);
  }
}

export async function resendVerification(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    const result = await resendVerificationEmail(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function requestPasswordResetEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await requestPasswordReset(email);
    // Always return success to prevent email enumeration
    res.json({ success: true, message: 'If that email exists, a password reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password } = z.object({
      token: z.string(),
      password: z.string().min(8).max(128),
    }).parse(req.body);

    await resetPassword(token, password);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Invalid') || err.message.includes('expired'))) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function deleteAccountEndpoint(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    await deleteUserAccount(req.user.userId);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function requestDeletionEndpoint(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await requestAccountDeletion(req.user.userId);
    res.json({ success: true, message: 'A confirmation email has been sent. Click the link to permanently delete your account.' });
  } catch (err) {
    next(err);
  }
}

export async function confirmDeletionEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.query);
    await confirmAccountDeletion(token);
    res.json({ success: true, message: 'Your account has been permanently deleted.' });
  } catch (err: any) {
    const msg: string = err?.message ?? '';
    if (msg.includes('Invalid') || msg.includes('expired')) {
      res.status(400).json({ error: msg });
      return;
    }
    next(err);
  }
}