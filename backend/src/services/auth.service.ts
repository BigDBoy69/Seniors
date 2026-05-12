import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { securityLogger, logAuthAttempt, logAdminAction } from "../lib/security-logger";

// Security: Enforce minimum JWT secret length and reject known placeholder values
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  securityLogger.error('Invalid JWT_SECRET configuration', {
    secretLength: JWT_SECRET?.length || 0,
    required: 32,
  });
  throw new Error('JWT_SECRET must be at least 32 characters');
}
// Reject placeholder / example values that may have been copied from .env.example.
// A legitimate secret must not contain these substrings.
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

interface TokenPayload {
  adminId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

type LockEntry = { count: number; lockUntil: number; lastAttempt: number };

// Per IP+email lockout — existing behaviour, fires at MAX_LOGIN_ATTEMPTS (5)
const failedAttempts = new Map<string, LockEntry>();

// Global per-account lockout — IP-agnostic, fires at GLOBAL_ACCOUNT_LOCKOUT_THRESHOLD (10)
// Prevents brute-force via IP rotation.
// NOTE: Both maps are in-memory and reset on server restart. Move to Redis for persistence.
const accountLockouts = new Map<string, LockEntry>();
const GLOBAL_ACCOUNT_LOCKOUT_THRESHOLD = 10;

// Clean up stale entries for both maps periodically
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
  // Use bcrypt with cost factor 12 (takes ~250ms per hash)
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET!, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'akwaluzto',
    audience: 'akwaluzto-admin'
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET!, {
      issuer: 'akwaluzto',
      audience: 'akwaluzto-admin'
    }) as unknown as TokenPayload;
  } catch (error) {
    securityLogger.warn('JWT verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

function getLoginIdentifier(email: string, ip?: string): string {
  return `${email.toLowerCase()}:${ip || 'unknown'}`;
}

export function isAccountLocked(identifier: string): boolean {
  const attempt = failedAttempts.get(identifier);
  if (!attempt) return false;
  
  if (attempt.lockUntil > Date.now()) {
    return true;
  }
  return false;
}

export function getLockoutTimeRemaining(identifier: string): number {
  const attempt = failedAttempts.get(identifier);
  if (!attempt) return 0;
  
  const remaining = attempt.lockUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function recordFailedLogin(identifier: string): void {
  const now = Date.now();
  const attempt = failedAttempts.get(identifier) || { count: 0, lockUntil: 0, lastAttempt: 0 };
  
  attempt.count++;
  attempt.lastAttempt = now;
  
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockUntil = now + LOCKOUT_DURATION_MS;
    securityLogger.warn('Account locked due to failed login attempts', {
      identifier: maskIdentifier(identifier),
      attempts: attempt.count,
      lockDurationMinutes: 30
    });
  }
  
  failedAttempts.set(identifier, attempt);
}

export function clearFailedLogins(identifier: string): void {
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
    securityLogger.warn('Admin account globally locked — cross-IP brute-force threshold reached', {
      email: maskEmail(email),
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
  const [email] = identifier.split(':');
  if (!email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}***@${domain}`;
}

export async function authenticateAdmin(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
) {
  const normalizedEmail = email.toLowerCase();
  const identifier = getLoginIdentifier(normalizedEmail, ip);

  // Check global account lockout first (covers IP-rotation attacks)
  if (isGlobalAccountLocked(normalizedEmail)) {
    const remaining = Math.ceil(getGlobalLockoutTimeRemaining(normalizedEmail) / 60000);
    securityLogger.warn('Blocked login — admin account globally locked', {
      email: maskEmail(normalizedEmail),
      ip,
      remainingMinutes: remaining,
    });
    throw new Error(`Account is temporarily locked. Please try again in ${remaining} minutes.`);
  }

  // Check per-IP lockout
  if (isAccountLocked(identifier)) {
    const remaining = Math.ceil(getLockoutTimeRemaining(identifier) / 60000);
    securityLogger.warn('Blocked login attempt for locked account', {
      email: maskEmail(normalizedEmail),
      ip,
      remainingMinutes: remaining,
    });
    throw new Error(`Account is temporarily locked. Please try again in ${remaining} minutes.`);
  }

  const admin = await prisma.admin.findUnique({ where: { email: normalizedEmail } });

  if (!admin) {
    recordFailedLogin(identifier);
    recordGlobalFailedLogin(normalizedEmail);
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'User not found');
    throw new Error("Invalid credentials");
  }

  if (!admin.active) {
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'Account disabled');
    throw new Error("Account is disabled. Contact support.");
  }

  const isValid = await comparePassword(password, admin.password);

  if (!isValid) {
    recordFailedLogin(identifier);
    recordGlobalFailedLogin(normalizedEmail);
    const attempts = failedAttempts.get(identifier)?.count || 1;
    logAuthAttempt(false, normalizedEmail, ip || 'unknown', userAgent, 'Invalid password');

    if (attempts >= MAX_LOGIN_ATTEMPTS - 1) {
      throw new Error(`Invalid credentials. ${MAX_LOGIN_ATTEMPTS - attempts} attempts remaining before lockout.`);
    }
    throw new Error("Invalid credentials");
  }

  // Successful login — clear both lockout counters
  clearFailedLogins(identifier);
  clearGlobalFailedLogins(normalizedEmail);
  logAuthAttempt(true, normalizedEmail, ip || 'unknown', userAgent);
  
  // Log admin action
  logAdminAction(admin.id, 'LOGIN', 'system', ip || 'unknown', { userAgent: userAgent?.slice(0, 100) });

  const token = generateToken({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });

  securityLogger.info('Admin authenticated successfully', {
    adminId: admin.id,
    email: maskEmail(admin.email),
    ip: ip || 'unknown'
  });

  return {
    token,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}

export async function createAdmin(
  email: string, 
  password: string, 
  name: string,
  createdBy?: { adminId: string; ip?: string }
) {
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.message);
  }
  
  const existingAdmin = await prisma.admin.findUnique({ 
    where: { email: email.toLowerCase() } 
  });
  
  if (existingAdmin) {
    securityLogger.warn('Attempted to create admin with existing email', {
      email: maskEmail(email),
      existingAdminId: existingAdmin.id
    });
    throw new Error("Admin with this email already exists");
  }

  const hashedPassword = await hashPassword(password);

  const admin = await prisma.admin.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: "ADMIN",
      active: true,
    },
  });

  securityLogger.info('New admin created', {
    adminId: admin.id,
    email: maskEmail(admin.email),
    createdBy: createdBy?.adminId,
    ip: createdBy?.ip
  });

  logAdminAction(admin.id, 'ACCOUNT_CREATED', 'admin', createdBy?.ip || 'system', {
    createdBy: createdBy?.adminId
  });

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters' };
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

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `***@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

// Export for use in other modules
export { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS };
