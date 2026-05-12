import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// Security middleware imports
import { 
  applySecurityMiddleware,
  authRateLimit,
  passwordResetRateLimit,
  contactRateLimit,
  adminRateLimit,
  recommendationsRateLimit,
  resendVerificationRateLimit,
  newsletterRateLimit,
  chatRateLimit,
  deletionRequestRateLimit,
} from "./middleware/security";
import { securityLogger } from "./lib/security-logger";

// Route imports
import { productRouter, productAdminRouter } from "./routes/products.routes";
import { orderRouter, orderAdminRouter } from "./routes/orders.routes";
import { miscRouter, miscAdminRouter } from "./routes/misc.routes";
import { authRouter } from "./routes/auth.routes";
import { userAuthRouter } from "./routes/userAuth.routes";
import { accountRouter } from "./routes/account.routes";
import { contactRouter } from "./routes/contact.routes";
import { cmsAdminRouter, siteRouter } from "./routes/cms.routes";
import { uploadRouter } from "./routes/upload.routes";
import recommendationsRouter from "./routes/recommendations.routes";
import { paymentRouter } from "./routes/payments.routes";
import { chatRouter } from "./routes/chat.routes";

// Middleware imports
import { requireAuth } from "./middleware/auth";
import { requireUserAuth } from "./controllers/userAuth.controller";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 4000;
const isProduction = process.env.NODE_ENV === 'production';

// ─── Ensure required directories exist ────────────────────────────────────────
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Security Middleware Application ──────────────────────────────────────────
// Must be applied BEFORE static files so that Helmet headers (HSTS, CSP, X-Frame-Options)
// are set on every response including uploaded images.
applySecurityMiddleware(app);

// ─── Static files (uploaded images) ──────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// ─── Request Body Parsing with Size Limits ───────────────────────────────────
app.use(express.json({ 
  limit: '10mb',
  strict: true // Only parse arrays and objects
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// ─── Request ID Tracking ────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// ─── Health Check (no rate limiting) ───────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  // Minimal response — don't expose version or environment to unauthenticated callers
  res.json({ status: "ok" });
});

// Security endpoint removed — publicly advertising security features aids attackers

// ─── Strict Rate Limiting for Auth Endpoints ───────────────────────────────────
// accountLockout from security.ts is not applied here — lockout is handled inside
// auth.service.ts (recordFailedLogin / isAccountLocked) which shares state correctly.
app.use("/api/admin/auth/login", authRateLimit);
app.use("/api/auth/login", authRateLimit);
app.use("/api/auth/signup", authRateLimit);
app.use("/api/admin/auth/reset-password", passwordResetRateLimit);
app.use("/api/auth/reset-password", passwordResetRateLimit);
app.use("/api/auth/forgot-password", passwordResetRateLimit);
app.use("/api/auth/resend-verification", resendVerificationRateLimit);

// ─── Newsletter Rate Limiting ────────────────────────────────────────────────
app.use("/api/newsletter", newsletterRateLimit);

// ─── Contact Form Rate Limiting ─────────────────────────────────────────────────
app.use("/api/contact", contactRateLimit);

// ─── Admin Route Enhanced Security ────────────────────────────────────────────
app.use("/api/admin", adminRateLimit);

// ─── Recommendation / Search Rate Limiting ────────────────────────────────────
app.use("/api/recommendations", recommendationsRateLimit);

// ─── Chat Rate Limiting ────────────────────────────────────────────────────────
app.use("/api/chat", chatRateLimit);
// ─── Account Deletion Rate Limiting ───────────────────────────────────────────
app.use("/api/auth/request-deletion", deletionRequestRateLimit);

// ─── Public routes ────────────────────────────────────────────────────────────
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api", miscRouter);
app.use("/api/site", siteRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/chat", chatRouter);

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.use("/api/admin/auth", authRouter);
app.use("/api/auth", userAuthRouter);

// ─── Account routes (protected) ────────────────────────────────────────────────
app.use("/api/account", requireUserAuth, accountRouter);

// ─── Contact routes ────────────────────────────────────────────────────────────
app.use("/api/contact", contactRouter);

// ─── Admin routes (protected) ─────────────────────────────────────────────────
app.use("/api/admin/products", requireAuth, productAdminRouter);
app.use("/api/admin/orders", requireAuth, orderAdminRouter);
app.use("/api/admin", requireAuth, miscAdminRouter);
app.use("/api/admin/cms", requireAuth, cmsAdminRouter);
app.use("/api/admin/upload", requireAuth, uploadRouter);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Akwaluzto backend running on http://localhost:${PORT}`);
});

export default app;
