// ========================================
// SECURITY AUDIT LOGGER
// Production-grade security event logging
// Logs authentication attempts, admin actions, suspicious activity
// ========================================

import winston from 'winston';
import path from 'path';

// Determine log level from environment
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create security logger instance
export const securityLogger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'security' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
    }),
    // File output for security events
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'security.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Separate file for errors only
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'security-error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880,
      maxFiles: 5
    })
  ],
  // Don't exit on uncaught errors
  exitOnError: false
});

// Helper functions for specific security events
export function logAuthAttempt(
  success: boolean,
  email: string,
  ip: string,
  userAgent?: string,
  reason?: string
) {
  const maskedEmail = maskEmail(email);
  const level = success ? 'info' : 'warn';
  
  securityLogger.log(level, `Authentication ${success ? 'successful' : 'failed'}`, {
    event: 'AUTH_ATTEMPT',
    success,
    email: maskedEmail,
    ip,
    userAgent: userAgent?.slice(0, 100),
    reason,
    timestamp: new Date().toISOString()
  });
}

export function logAdminAction(
  adminId: string,
  action: string,
  resource: string,
  ip: string,
  details?: Record<string, any>
) {
  securityLogger.info('Admin action', {
    event: 'ADMIN_ACTION',
    adminId,
    action,
    resource,
    ip,
    details: sanitizeForLogging(details),
    timestamp: new Date().toISOString()
  });
}

export function logSuspiciousActivity(
  activity: string,
  ip: string,
  details: Record<string, any>
) {
  securityLogger.warn('Suspicious activity detected', {
    event: 'SUSPICIOUS_ACTIVITY',
    activity,
    ip,
    details: sanitizeForLogging(details),
    timestamp: new Date().toISOString()
  });
}

export function logSecurityViolation(
  violation: string,
  ip: string,
  path: string,
  details?: Record<string, any>
) {
  securityLogger.error('Security violation', {
    event: 'SECURITY_VIOLATION',
    violation,
    ip,
    path,
    details: sanitizeForLogging(details),
    timestamp: new Date().toISOString()
  });
}

export function logDataAccess(
  userId: string,
  resource: string,
  action: string,
  ip: string
) {
  securityLogger.info('Data access', {
    event: 'DATA_ACCESS',
    userId,
    resource,
    action,
    ip,
    timestamp: new Date().toISOString()
  });
}

export function logRateLimitExceeded(
  ip: string,
  path: string,
  limitType: string
) {
  securityLogger.warn('Rate limit exceeded', {
    event: 'RATE_LIMIT_EXCEEDED',
    ip,
    path,
    limitType,
    timestamp: new Date().toISOString()
  });
}

// Utility functions
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `***@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

function sanitizeForLogging(data: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!data) return undefined;
  
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'cvv', 'ssn'];
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export default securityLogger;
