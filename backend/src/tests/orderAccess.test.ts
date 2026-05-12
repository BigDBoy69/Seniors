/**
 * Order Access Control Tests
 *
 * Guest orders (userId=null) must require phone verification.
 * Authenticated orders must only be accessible by the owning user.
 * These rules prevent PII leakage across users.
 *
 * We test the access decision logic directly, isolated from Express/Prisma.
 */
import { describe, it, expect } from 'vitest';

// Access decision logic extracted from orders.controller.ts getOrder()
// Returns 'owner' | 'denied' | 'requires-phone'
function resolveOrderAccess(
  order: { userId: string | null; phone: string },
  auth: { type: 'jwt'; userId: string } | { type: 'phone'; phone: string } | { type: 'none' }
): 'granted' | 'denied' | 'requires-phone' {
  if (auth.type === 'jwt') {
    // Authenticated: order must be explicitly linked to this user
    if (!order.userId || order.userId !== auth.userId) return 'denied';
    return 'granted';
  }

  if (auth.type === 'phone') {
    // Guest access: phone must match
    const normalise = (p: string) => p.replace(/\s/g, '');
    if (!order.userId && normalise(order.phone) === normalise(auth.phone)) return 'granted';
    return 'denied';
  }

  // No auth at all
  if (!order.userId) return 'requires-phone';
  return 'denied';
}

describe('order access control', () => {
  const guestOrder = { userId: null, phone: '+96171577939' };
  const userOrder  = { userId: 'user-abc', phone: '+96171577939' };

  it('grants JWT access when userId matches', () => {
    expect(resolveOrderAccess(userOrder, { type: 'jwt', userId: 'user-abc' })).toBe('granted');
  });

  it('denies JWT access when userId does not match', () => {
    expect(resolveOrderAccess(userOrder, { type: 'jwt', userId: 'user-xyz' })).toBe('denied');
  });

  it('denies JWT access to guest orders even with a valid JWT', () => {
    // Critical: a JWT cannot access a guest order — prevents PII leak
    expect(resolveOrderAccess(guestOrder, { type: 'jwt', userId: 'user-abc' })).toBe('denied');
  });

  it('grants guest access when phone matches', () => {
    expect(resolveOrderAccess(guestOrder, { type: 'phone', phone: '+96171577939' })).toBe('granted');
  });

  it('denies guest access when phone does not match', () => {
    expect(resolveOrderAccess(guestOrder, { type: 'phone', phone: '+96100000000' })).toBe('denied');
  });

  it('requires phone (not denied) when no auth and order is a guest order', () => {
    expect(resolveOrderAccess(guestOrder, { type: 'none' })).toBe('requires-phone');
  });

  it('normalises phone whitespace during comparison', () => {
    expect(resolveOrderAccess(
      { userId: null, phone: '+961 71 577 939' },
      { type: 'phone', phone: '+96171577939' }
    )).toBe('granted');
  });
});
