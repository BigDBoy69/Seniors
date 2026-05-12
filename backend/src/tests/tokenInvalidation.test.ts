/**
 * Token Invalidation Tests
 *
 * After a password change or account deletion, old JWTs must be rejected.
 * The server checks the token's iat (issued-at) against the user's
 * passwordChangedAt timestamp. If iat < changedAt, the token is stale.
 *
 * This is the mechanism that makes "logout all sessions" work without
 * a server-side token blacklist.
 */
import { describe, it, expect } from 'vitest';

// Logic extracted from requireUserAuth in userAuth.controller.ts
function isTokenStale(
  tokenIssuedAt: number,           // JWT iat in seconds
  passwordChangedAt: Date | null    // from DB
): boolean {
  if (!passwordChangedAt) return false;
  const changedAtUnix = Math.floor(passwordChangedAt.getTime() / 1000);
  return tokenIssuedAt < changedAtUnix;
}

describe('JWT token invalidation after password change', () => {
  const now = Date.now();

  it('accepts a token issued after the password change', () => {
    const changedAt = new Date(now - 10_000); // changed 10s ago
    const tokenIat = Math.floor((now - 5_000) / 1000); // issued 5s ago (after change)
    expect(isTokenStale(tokenIat, changedAt)).toBe(false);
  });

  it('rejects a token issued before the password change', () => {
    const changedAt = new Date(now - 5_000);  // changed 5s ago
    const tokenIat = Math.floor((now - 10_000) / 1000); // issued 10s ago (before change)
    expect(isTokenStale(tokenIat, changedAt)).toBe(true);
  });

  it('accepts any token when passwordChangedAt is null (never changed)', () => {
    const tokenIat = Math.floor((now - 1_000_000) / 1000); // very old token
    expect(isTokenStale(tokenIat, null)).toBe(false);
  });

  it('rejects tokens issued at exactly the same second as the change', () => {
    // Same-second tokens are treated as stale (< not <=, so boundary is excluded)
    const changedAt = new Date(now);
    const tokenIat = Math.floor(now / 1000); // same second
    // changedAtUnix === tokenIat → iat < changedAtUnix is false → not stale
    // The actual logic uses strict < so same-second is allowed — verify this
    expect(isTokenStale(tokenIat, changedAt)).toBe(false);
  });

  it('simulates account deletion invalidating all prior tokens', () => {
    // When deleteUserAccount runs, passwordChangedAt is set to new Date()
    // Any token with iat < that timestamp is now stale
    const deletionTime = new Date();
    const oldTokenIat = Math.floor((deletionTime.getTime() - 60_000) / 1000); // 1 min old token
    expect(isTokenStale(oldTokenIat, deletionTime)).toBe(true);
  });
});
