import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dns from "dns";
import { prisma } from "../lib/prisma";
import { securityLogger, logAuthAttempt } from "../lib/security-logger";
import { sendVerificationEmail, sendPasswordResetEmail, sendAccountDeletionEmail } from "./email.service";

// Validate JWT_SECRET at startup — refuse to run with a missing, weak, or placeholder secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  securityLogger.error('Invalid JWT_SECRET configuration', {
    secretLength: JWT_SECRET?.length ?? 0,
    required: 32,
  });
  throw new Error('JWT_SECRET must be at least 32 characters');
}
// Reject known placeholder values that pass the length check but are publicly known.
const JWT_WEAK_PATTERNS = [
  'your-super-secret',
  'change-this-in-production',
  'min-32-chars',
  'changeme',
  'placeholder',
  'example',
  'jwt-secret',
];
if (JWT_WEAK_PATTERNS.some((p) => JWT_SECRET.toLowerCase().includes(p))) {
  throw new Error(
    'JWT_SECRET appears to be a placeholder. Set a cryptographically random value: ' +
    'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

// Cast to any: @types/jsonwebtoken@9 uses ms.StringValue (branded) for expiresIn.
// Plain string satisfies it at runtime; the cast avoids the brand check.
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as any;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface UserTokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number; // issued-at Unix timestamp, populated by jsonwebtoken
}

type LockEntry = { count: number; lockUntil: number; lastAttempt: number };

// Per IP+email lockout — fires at MAX_LOGIN_ATTEMPTS (5)
const failedAttempts = new Map<string, LockEntry>();

// Global per-account lockout — IP-agnostic, fires at GLOBAL_ACCOUNT_LOCKOUT_THRESHOLD (10)
// Prevents brute-force via IP rotation.
// NOTE: Both maps are in-memory and reset on server restart. Move to Redis for persistence.
const accountLockouts = new Map<string, LockEntry>();
const GLOBAL_ACCOUNT_LOCKOUT_THRESHOLD = 10;

// Periodic cleanup of stale entries for both maps
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of failedAttempts.entries()) {
    if (value.lockUntil < now && value.lastAttempt < now - 3600000) {
      failedAttempts.delete(key);
    }
  }
  for (const [key, value] of accountLockouts.entries()) {
    if (value.lockUntil < now && value.lastAttempt < now - 3600000) {
      accountLockouts.delete(key);
    }
  }
}, 600000);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateUserToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'akwaluzto',
    audience: 'akwaluzto-user',
  });
}

export function verifyUserToken(token: string): UserTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET!, {
      issuer: 'akwaluzto',
      audience: 'akwaluzto-user',
    }) as unknown as UserTokenPayload;
  } catch (error) {
    securityLogger.warn('User JWT verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password must not exceed 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

function getLoginIdentifier(email: string, ip?: string): string {
  return `user:${email}:${ip || 'unknown'}`;
}

function isAccountLocked(identifier: string): boolean {
  const attempt = failedAttempts.get(identifier);
  return !!attempt && attempt.lockUntil > Date.now();
}

function getLockoutTimeRemaining(identifier: string): number {
  const attempt = failedAttempts.get(identifier);
  if (!attempt) return 0;
  const remaining = attempt.lockUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

function recordFailedLogin(identifier: string): void {
  const now = Date.now();
  const attempt = failedAttempts.get(identifier) || { count: 0, lockUntil: 0, lastAttempt: 0 };
  attempt.count++;
  attempt.lastAttempt = now;
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockUntil = now + LOCKOUT_DURATION_MS;
    attempt.count = 0;
    securityLogger.warn('User account locked due to failed login attempts', {
      identifier: maskIdentifier(identifier),
      lockDurationMinutes: 30
    });
  }
  failedAttempts.set(identifier, attempt);
}

function clearFailedLogins(identifier: string): void {
  failedAttempts.delete(identifier);
}

function isGlobalAccountLocked(email: string): boolean {
  const entry = accountLockouts.get(email);
  return !!entry && entry.lockUntil > Date.now();
}

function getGlobalLockoutTimeRemaining(email: string): number {
  const entry = accountLockouts.get(email);
  if (!entry) return 0;
  const remaining = entry.lockUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

function recordGlobalFailedLogin(email: string): void {
  const now = Date.now();
  const entry = accountLockouts.get(email) || { count: 0, lockUntil: 0, lastAttempt: 0 };
  entry.count++;
  entry.lastAttempt = now;
  if (entry.count >= GLOBAL_ACCOUNT_LOCKOUT_THRESHOLD) {
    entry.lockUntil = now + LOCKOUT_DURATION_MS;
    entry.count = 0;
    securityLogger.warn('User account globally locked — cross-IP brute-force threshold reached', {
      email: maskIdentifier(`user:${email}:`),
      threshold: GLOBAL_ACCOUNT_LOCKOUT_THRESHOLD,
      lockDurationMinutes: 30,
    });
  }
  accountLockouts.set(email, entry);
}

function clearGlobalFailedLogins(email: string): void {
  accountLockouts.delete(email);
}

function maskIdentifier(identifier: string): string {
  // format: "user:email:ip"
  const parts = identifier.split(':');
  const email = parts[1] || '';
  if (!email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `***@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

async function validateEmailDomain(email: string): Promise<void> {
  const domain = email.split('@')[1];
  if (!domain) throw new Error('Invalid email address');
  try {
    const records = await dns.promises.resolveMx(domain);
    if (!records || records.length === 0) {
      throw new Error('Email domain does not accept email');
    }
  } catch (err: any) {
    if (err.message === 'Email domain does not accept email') throw err;
    // DNS resolution failed — domain doesn't exist or has no MX records
    throw new Error('Email address is invalid or the domain does not exist');
  }
}

export async function createUser(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  phone?: string
) {
  const pwValidation = validatePasswordStrength(password);
  if (!pwValidation.valid) {
    throw new Error(pwValidation.message);
  }

  const normalizedEmail = email.toLowerCase().trim();

  await validateEmailDomain(normalizedEmail);

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      phone,
      role: "USER",
      active: true,
    },
  });

  await prisma.userSettings.create({
    data: { userId: user.id },
  });

  securityLogger.info('New user registered', {
    userId: user.id,
    email: maskIdentifier(`user:${normalizedEmail}:`)
  });

  // Generate and send verification email � truly non-blocking, errors must not fail signup
  generateVerificationToken(user.id)
    .then(token => sendVerificationEmail(user.email, token, user.firstName))
    .catch(err => securityLogger.error('Verification email failed after signup', {
      userId: user.id,
      error: (err as Error).message,
    }));

  const token = generateUserToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  };
}

export async function authenticateUser(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
) {
  const normalizedEmail = email.toLowerCase().trim();
  const identifier = getLoginIdentifier(normalizedEmail, ip);

  // Check global account lockout first (covers IP-rotation attacks)
  if (isGlobalAccountLocked(normalizedEmail)) {
    const remaining = Math.ceil(getGlobalLockoutTimeRemaining(normalizedEmail) / 60000);
    securityLogger.warn('Blocked user login — account globally locked', {
      email: maskIdentifier(`user:${normalizedEmail}:`),
      remainingMinutes: remaining,
      ip,
    });
    throw new Error(`Account is temporarily locked. Please try again in ${remaining} minutes.`);
  }

  // Check per-IP lockout
  if (isAccountLocked(identifier)) {
    const remaining = Math.ceil(getLockoutTimeRemaining(identifier) / 60000);
    securityLogger.warn('Blocked user login attempt - account locked', {
      email: maskIdentifier(identifier),
      remainingMinutes: remaining,
      ip,
    });
    throw new Error(`Account is temporarily locked. Please try again in ${remaining} minutes.`);
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    recordFailedLogin(identifier);
    recordGlobalFailedLogin(normalizedEmail);
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'User not found');
    throw new Error("Invalid credentials");
  }

  if (!user.active) {
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'Account disabled');
    throw new Error("Account is disabled");
  }

  const isValid = await comparePassword(password, user.passwordHash);

  if (!isValid) {
    recordFailedLogin(identifier);
    recordGlobalFailedLogin(normalizedEmail);
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'Invalid password');
    throw new Error("Invalid credentials");
  }

  // Block login if email not verified
  if (!user.emailVerified) {
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'Email not verified');
    throw new Error('email_not_verified');
  }

  // Successful login — clear both lockout counters
  clearFailedLogins(identifier);
  clearGlobalFailedLogins(normalizedEmail);
  logAuthAttempt(true, normalizedEmail, ip || 'unknown', userAgent);

  const token = generateUserToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
    settings: user.settings,
    createdAt: user.createdAt,
  };
}

// ========================================
// EMAIL VERIFICATION
// ========================================

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationTokenExpiry: expiry,
    },
  });

  return token;
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
  });

  if (!user) {
    return { success: false, message: "Invalid or expired verification link" };
  }

  if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    return { success: false, message: "Verification link has expired" };
  }

  if (user.emailVerified) {
    return { success: true, message: "Email already verified" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  });

  securityLogger.info("Email verified", { userId: user.id, email: maskIdentifier(`user:${user.email}:`) });

  return { success: true, message: "Email verified successfully" };
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    // Don't reveal whether email exists
    return { success: true, message: "If that email is registered, a verification email has been sent" };
  }

  if (user.emailVerified) {
    // Don't reveal verification status — return same generic message to prevent enumeration
    return { success: true, message: "If that email requires verification, a new link has been sent" };
  }

  const token = await generateVerificationToken(user.id);
  await sendVerificationEmail(user.email, token, user.firstName);

  return { success: true, message: "If that email requires verification, a new link has been sent" };
}

// ========================================
// PASSWORD RESET
// ========================================

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Don't reveal if user exists (security best practice)
  if (!user) {
    securityLogger.warn('Password reset requested for non-existent email', {
      email: maskIdentifier(`user:${normalizedEmail}:`),
    });
    return; // Return success to prevent email enumeration
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: expiry,
    },
  });

  securityLogger.info('Password reset token generated', {
    userId: user.id,
    email: maskIdentifier(`user:${normalizedEmail}:`),
    expiresAt: expiry.toISOString(),
  });

  // Send reset email (non-blocking)
  await sendPasswordResetEmail(user.email, resetToken, user.firstName);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const pwValidation = validatePasswordStrength(newPassword);
  if (!pwValidation.valid) {
    throw new Error(pwValidation.message);
  }

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    throw new Error('Reset token has expired');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordChangedAt: new Date(), // Invalidate all existing JWTs
    },
  });

  securityLogger.info('Password reset completed', {
    userId: user.id,
    email: maskIdentifier(`user:${user.email}:`),
  });
}

// ========================================
// DELETE ACCOUNT
// ========================================

export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error('User not found');
  }

  // Soft delete: mark as inactive instead of hard delete
  // This preserves order history and referential integrity
  // passwordChangedAt is updated to immediately invalidate all existing JWTs
  await prisma.user.update({
    where: { id: userId },
    data: {
      active: false,
      email: `deleted_${Date.now()}_${user.email}`, // Prevent email reuse
      passwordChangedAt: new Date(), // Invalidate all existing tokens immediately
    },
  });

  securityLogger.info('User account deleted (soft delete)', {
    userId,
    email: maskIdentifier(`user:${user.email}:`),
  });
}

// ========================================
// EMAIL-CONFIRMED ACCOUNT DELETION
// ========================================

export async function requestAccountDeletion(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) throw new Error('User not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: userId },
    data: { deleteAccountToken: token, deleteAccountTokenExpiry: expiry },
  });

  securityLogger.info('Account deletion requested', {
    userId,
    email: maskIdentifier(`user:${user.email}:`),
    expiresAt: expiry.toISOString(),
  });

  await sendAccountDeletionEmail(user.email, token, user.firstName);
}

export async function confirmAccountDeletion(token: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { deleteAccountToken: token },
  });

  if (!user || !user.active) throw new Error('Invalid or expired deletion link');

  if (!user.deleteAccountTokenExpiry || user.deleteAccountTokenExpiry < new Date()) {
    // Clear stale token
    await prisma.user.update({
      where: { id: user.id },
      data: { deleteAccountToken: null, deleteAccountTokenExpiry: null },
    });
    throw new Error('Deletion link has expired. Please request a new one.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      active: false,
      email: `deleted_${Date.now()}_${user.email}`,
      passwordChangedAt: new Date(), // Invalidate all existing JWTs immediately
      deleteAccountToken: null,
      deleteAccountTokenExpiry: null,
    },
  });

  securityLogger.info('Account deletion confirmed', {
    userId: user.id,
    email: maskIdentifier(`user:${user.email}:`),
  });
}
