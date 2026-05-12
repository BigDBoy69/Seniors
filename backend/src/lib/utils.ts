export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  // 6 random chars = 36^6 ≈ 2.2 billion possibilities per millisecond
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AKW-${timestamp}-${random}`;
}
