// ========================================
// SECURITY MIDDLEWARE MODULE
// Production-grade security protections for Akwaluzto
// Implements: Helmet, rate limiting, CSP, secure headers
// ========================================

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import { Express, Request, Response, NextFunction } from 'express';
import { securityLogger } from '../lib/security-logger';

// ========================================
// ENVIRONMENT CONFIGURATION
// ========================================

const isProduction = process.env.NODE_ENV === 'production';

// Build the trusted origins list from env vars.
// FRONTEND_URL is always included so it doesn't need to be repeated in TRUSTED_ORIGINS.
const TRUSTED_ORIGINS: string[] = [
  ...(process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Dev fallbacks — only used when neither env var is set
  ...(!process.env.TRUSTED_ORIGINS && !process.env.FRONTEND_URL
    ? ['http://localhost:5173', 'http://localhost:3000']
    : []),
];

// ========================================
// 1. HELMET SECURITY HEADERS
// ========================================

export const helmetMiddleware = helmet({
  // Content Security Policy - strict in production
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind/shadcn
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'",
        isProduction ? '' : "'unsafe-eval'" // Eval only in dev
      ].filter(Boolean),
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "https://cdn.sanity.io", // Sanity CMS images
        "https://*.amazonaws.com" // S3 if used
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || '',
        process.env.SANITY_PROJECT_ID ? `https://${process.env.SANITY_PROJECT_ID}.api.sanity.io` : ''
      ].filter(Boolean),
      frameSrc: ["'none'"], // Prevent clickjacking
      objectSrc: ["'none'"], // Prevent Flash/PDF exploits
      mediaSrc: ["'self'"],
      childSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },

  // Strict Transport Security - force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // X-Frame-Options - prevent clickjacking
  frameguard: {
    action: 'deny' // DENY is stronger than SAMEORIGIN
  },

  // X-Content-Type-Options - prevent MIME sniffing
  noSniff: true,

  // X-XSS-Protection - legacy browser protection
  xssFilter: true,

  // Referrer Policy - limit referrer leakage
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Cross-Origin policies
  crossOriginEmbedderPolicy: isProduction,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CDN images

  // Disable DNS prefetching to prevent info leakage
  dnsPrefetchControl: { allow: false },

  // Hide powered-by header (set to custom value or empty)
  hidePoweredBy: true,

  // IE only - disable download open
  ieNoOpen: true
});

// ========================================
// 2. RATE LIMITING CONFIGURATION
// ========================================

// General API rate limit - 100 requests per 15 minutes
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(15 * 60) // seconds
    });
  },
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Strict rate limit for authentication endpoints - 5 attempts per 15 minutes
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Auth rate limit exceeded - possible brute force', {
      ip: req.ip,
      email: req.body.email ? maskEmail(req.body.email) : undefined,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: Math.ceil(15 * 60),
      message: 'Please try again in 15 minutes or contact support'
    });
  },
  skip: (req: Request) => {
    // Only skip rate limiting for localhost in development mode
    if (isProduction) return false;
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});

// Account lockout middleware - track failed attempts per account
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();

export function accountLockout(req: Request, res: Response, next: NextFunction) {
  const identifier = req.body.email?.toLowerCase() || req.ip;
  
  const attempt = failedAttempts.get(identifier);
  if (attempt && attempt.lockUntil > Date.now()) {
    const remaining = Math.ceil((attempt.lockUntil - Date.now()) / 1000 / 60);
    securityLogger.warn('Blocked login attempt for locked account', {
      identifier: maskEmail(identifier),
      remainingMinutes: remaining
    });
    return res.status(423).json({
      error: 'Account is temporarily locked',
      retryAfter: remaining * 60,
      message: `Too many failed attempts. Please try again in ${remaining} minutes.`
    });
  }
  
  next();
}

// Record failed attempt
export function recordFailedAttempt(identifier: string) {
  const attempt = failedAttempts.get(identifier) || { count: 0, lockUntil: 0 };
  attempt.count++;
  
  // Lock for 30 minutes after 5 failed attempts
  if (attempt.count >= 5) {
    attempt.lockUntil = Date.now() + 30 * 60 * 1000;
    attempt.count = 0;
    securityLogger.warn('Account locked due to failed attempts', {
      identifier: maskEmail(identifier),
      lockDurationMinutes: 30
    });
  }
  
  failedAttempts.set(identifier, attempt);
}

// Clear failed attempts on success
export function clearFailedAttempts(identifier: string) {
  failedAttempts.delete(identifier);
}

// Strict rate limit for password reset - 3 attempts per hour
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      email: req.body.email ? maskEmail(req.body.email) : undefined
    });
    res.status(429).json({
      error: 'Too many password reset attempts',
      retryAfter: 60 * 60
    });
  }
});

// Rate limit for contact form - 2 submissions per hour (prevent spam)
export const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Contact form rate limit exceeded', {
      ip: req.ip,
      email: req.body.email ? maskEmail(req.body.email) : undefined
    });
    res.status(429).json({
      error: 'Too many contact form submissions',
      retryAfter: 60 * 60,
      message: 'Please wait before submitting another message'
    });
  },
  skip: (req: Request) => {
    if (isProduction) return false;
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});

// Admin endpoint rate limit — covers CMS and data endpoints.
// Auth sub-routes (/api/admin/auth/*) are excluded here; they have their own dedicated authRateLimit.
export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // ~13 requests per dashboard load; 300 allows ~20 full loads per 15-minute window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.path.startsWith('/auth'),
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      adminId: (req as any).admin?.adminId,
      path: req.path
    });
    res.status(429).json({
      error: 'Rate limit exceeded for admin operations'
    });
  }
});

// Targeted rate limit for order lookup by ID — prevents phone number brute-force
// on GET /api/orders/:id?phone=. 10 requests per IP per 15 minutes is generous
// for legitimate users (order confirmation page) but makes enumeration infeasible.
export const orderLookupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Order lookup rate limit exceeded — possible phone enumeration', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']?.slice(0, 100),
    });
    res.status(429).json({
      error: 'Too many order lookup attempts. Please try again later.',
      retryAfter: 15 * 60,
    });
  },
});

// Chat endpoint — prevent LLM cost abuse (20 messages per 15 minutes per IP)
export const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Chat rate limit exceeded', {
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 100),
    });
    res.status(429).json({
      error: 'Too many messages. Please wait a moment before continuing.',
      retryAfter: 15 * 60,
    });
  },
  skip: (req: Request) => {
    if (isProduction) return false;
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});

// Email verification resend — prevent verification email spam (3 per hour)
export const resendVerificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Resend verification rate limit exceeded', {
      ip: req.ip,
      email: req.body.email ? maskEmail(req.body.email) : undefined,
    });
    res.status(429).json({
      error: 'Too many verification email requests',
      retryAfter: 60 * 60,
    });
  },
  skip: (req: Request) => {
    if (isProduction) return false;
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});

// Newsletter subscribe — prevent subscription spam (5 per hour)
export const newsletterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Newsletter subscribe rate limit exceeded', {
      ip: req.ip,
      email: req.body.email ? maskEmail(req.body.email) : undefined,
    });
    res.status(429).json({
      error: 'Too many newsletter subscription attempts',
      retryAfter: 60 * 60,
    });
  },
  skip: (req: Request) => {
    if (isProduction) return false;
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});

// Account deletion request — very strict, 2 per hour (prevents deletion-spam attacks)
export const deletionRequestRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Account deletion rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      error: 'Too many deletion requests. Please try again later.',
      retryAfter: 60 * 60,
    });
  },
  skip: (req: Request) => {
    if (isProduction) return false;
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});

// Recommendation / search endpoints — prevent scraping and analytics abuse
export const recommendationsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // ~8 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    securityLogger.warn('Recommendations rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']?.slice(0, 100)
    });
    res.status(429).json({
      error: 'Too many requests to recommendation endpoints',
      retryAfter: 15 * 60
    });
  }
});

// Slow down responses for suspicious traffic (speed-bump)
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // After 50 requests
  delayMs: (used: number) => Math.max(0, used - 50) * 500,
  maxDelayMs: 2000 // Cap at 2 seconds
});

// ========================================
// 3. CORS CONFIGURATION
// ========================================

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // In production, require origin to be explicitly trusted
    // In development, allow no-origin requests (curl, Postman, etc.)
    if (!origin) {
      if (isProduction) {
        // Null-origin requests in production could be sandboxed iframe attacks
        // Only allow if explicitly configured
        const allowNullOrigin = process.env.ALLOW_NULL_ORIGIN === 'true';
        if (allowNullOrigin) return callback(null, true);
        securityLogger.warn('CORS blocked null-origin request in production');
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, true);
    }
    
    if (TRUSTED_ORIGINS.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      securityLogger.warn('CORS blocked request from untrusted origin', {
        origin,
        ip: 'unknown'
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
  maxAge: 86400 // 24 hours
});

// ========================================
// 4. INPUT SANITIZATION
// ========================================

// NoSQL injection prevention (MongoDB-specific, but good practice)
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }: { req: import('express').Request; key: string }) => {
    securityLogger.warn('NoSQL injection attempt sanitized', {
      ip: req.ip,
      path: req.path,
      key
    });
  }
});

// XSS prevention
export const xssProtection = xss();

// HTTP Parameter Pollution prevention
export const hppProtection = hpp({
  whitelist: [
    // Allow multiple values for these fields only
    'category',
    'size',
    'color'
  ]
});

// ========================================
// 5. REQUEST SIZE LIMITS
// ========================================

export const requestSizeLimits = {
  json: '10mb',
  urlencoded: '10mb',
  raw: '10mb'
};

// ========================================
// 6. SECURITY AUDIT LOGGING MIDDLEWARE
// ========================================

export function securityAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Log security-relevant requests
  const sensitivePaths = [
    '/api/auth',
    '/api/admin',
    '/api/orders',
    '/api/payments',
    '/api/contact'
  ];
  
  const isSensitive = sensitivePaths.some(path => req.path.startsWith(path));
  
  if (isSensitive) {
    securityLogger.info('Security-sensitive request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 100),
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id || (req as any).admin?.adminId || 'anonymous'
    });
  }
  
  next();
}

// ========================================
// 7. SECURE COOKIE SETTINGS
// ========================================

export const secureCookieSettings = {
  httpOnly: true, // No JavaScript access
  secure: isProduction, // HTTPS only in production
  sameSite: 'strict' as const, // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
  domain: isProduction ? process.env.COOKIE_DOMAIN : undefined
};

// ========================================
// 8. IP/PROXY CONFIGURATION
// ========================================

export function configureTrustProxy(app: Express) {
  // Trust proxy when behind load balancer (production)
  if (isProduction) {
    app.set('trust proxy', 1);
    
    // Additional proxy trust configuration
    app.use((req: Request, _res: Response, next: NextFunction) => {
      // Log real IP when behind proxy
      const realIp = req.headers['x-forwarded-for'] || req.ip;
      (req as any).realIp = realIp;
      next();
    });
  }
}

// ========================================
// 9. UTILITY FUNCTIONS
// ========================================

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

// ========================================
// 10. COMPLETE SECURITY SETUP
// ========================================

export function applySecurityMiddleware(app: Express) {
  // Trust proxy configuration first
  configureTrustProxy(app);
  
  // 1. Helmet security headers
  app.use(helmetMiddleware);
  
  // 2. CORS with strict origin checking
  app.use(corsMiddleware);
  
  // 3. Input sanitization
  app.use(sanitizeInput);
  app.use(xssProtection);
  app.use(hppProtection);
  
  // 4. General rate limiting (applied to all routes)
  app.use(generalRateLimit);
  
  // 5. Speed limiting for suspicious traffic
  app.use(speedLimiter);
  
  // 6. Security audit logging
  app.use(securityAuditMiddleware);
  
  // 7. Request ID for tracking
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || 
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
  });
  
  securityLogger.info('Security middleware initialized', {
    environment: process.env.NODE_ENV,
    trustProxy: isProduction,
    rateLimitsEnabled: true
  });
}

export default applySecurityMiddleware;
