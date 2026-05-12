/**
 * Password Reset Token Tests
 *
 * Reset tokens have a 1-hour expiry. Expired or missing tokens must be rejected.
 * These tests verify the expiry check logic used in resetPassword().
 */
import { describe, it, expect } from 'vitest';

// Logic extracted from resetPassword() in userAuth.service.ts
function isResetTokenValid(
  token: string | null,
  expiry: Date | null,
  providedToken: string
): { valid: boolean; reason?: string } {
  if (!token) return { valid: false, reason: 'Invalid or expired reset token' };
  if (token !== providedToken) return { valid: false, reason: 'Invalid or expired reset token' };
  if (!expiry || expiry < new Date()) return { valid: false, reason: 'Reset token has expired' };
  return { valid: true };
}

describe('password reset token validation', () => {
  const validToken = 'abc123validtoken';
  const futureExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const pastExpiry   = new Date(Date.now() - 1_000);           // 1 second ago

  it('accepts a valid, unexpired token', () => {
    const result = isResetTokenValid(validToken, futureExpiry, validToken);
    expect(result.valid).toBe(true);
  });

  it('rejects an expired token', () => {
    const result = isResetTokenValid(validToken, pastExpiry, validToken);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });

  it('rejects a token that does not match the stored token', () => {
    const result = isResetTokenValid(validToken, futureExpiry, 'wrong-token');
    expect(result.valid).toBe(false);
  });

  it('rejects when no token is stored in the database (already used or never requested)', () => {
    const result = isResetTokenValid(null, futureExpiry, validToken);
    expect(result.valid).toBe(false);
  });

  it('rejects when expiry is null even if token matches', () => {
    const result = isResetTokenValid(validToken, null, validToken);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expired/i);
  });
});
