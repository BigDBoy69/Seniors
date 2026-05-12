/**
 * Order Price Validation Tests
 *
 * The server always recomputes order totals from authoritative DB prices and
 * rejects the request if the client-supplied total doesn't match.
 * This is the primary defence against price manipulation attacks.
 *
 * We test the calculation logic directly — the same arithmetic the
 * createOrder and initiatePayment controllers use.
 */
import { describe, it, expect } from 'vitest';

// Mirror of the server-side price calculation logic used in
// orders.controller.ts and payments.controller.ts
function computeOrderTotal(
  items: Array<{ productId: string; quantity: number; price: number }>,
  priceMap: Map<string, number>
): { serverTotal: number; matches: (clientTotal: number) => boolean } {
  const serverSubtotal = items.reduce(
    (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
    0
  );
  const deliveryFee = 0;
  const serverTotal = serverSubtotal + deliveryFee;

  // Uses Math.round(*100) to avoid floating-point comparison issues — same as server
  return {
    serverTotal,
    matches: (clientTotal: number) =>
      Math.round(serverTotal * 100) === Math.round(clientTotal * 100),
  };
}

describe('server-side order price validation', () => {
  const priceMap = new Map([
    ['prod-shirt', 59.99],
    ['prod-pants', 89.99],
  ]);

  it('accepts an order when client total matches server prices', () => {
    const items = [{ productId: 'prod-shirt', quantity: 2, price: 59.99 }];
    const { matches } = computeOrderTotal(items, priceMap);
    expect(matches(119.98)).toBe(true);
  });

  it('rejects an order when client total is lower than server price (manipulation attempt)', () => {
    const items = [{ productId: 'prod-shirt', quantity: 2, price: 59.99 }];
    const { matches } = computeOrderTotal(items, priceMap);
    // Attacker sends total of $10 instead of $119.98
    expect(matches(10.00)).toBe(false);
  });

  it('rejects an order when client total is higher (sanity check)', () => {
    const items = [{ productId: 'prod-shirt', quantity: 1, price: 59.99 }];
    const { matches } = computeOrderTotal(items, priceMap);
    expect(matches(999.99)).toBe(false);
  });

  it('uses server price not client-supplied price', () => {
    // Client sends price=0.01 for a $59.99 shirt — server ignores it
    const items = [{ productId: 'prod-shirt', quantity: 1, price: 0.01 }];
    const { serverTotal } = computeOrderTotal(items, priceMap);
    // Server always uses priceMap value
    expect(serverTotal).toBe(59.99);
  });

  it('handles multi-item orders correctly', () => {
    const items = [
      { productId: 'prod-shirt', quantity: 1, price: 59.99 },
      { productId: 'prod-pants', quantity: 2, price: 89.99 },
    ];
    const { serverTotal, matches } = computeOrderTotal(items, priceMap);
    expect(serverTotal).toBeCloseTo(239.97, 2);
    expect(matches(239.97)).toBe(true);
    expect(matches(100.00)).toBe(false);
  });
});
