import crypto from "crypto";

const PAYMOB_BASE = process.env.PAYMOB_BASE_URL ?? "https://accept.paymob.com";

const PAYMOB_PLACEHOLDERS = [
  'your_paymob',
  'sk_test_your',
  'pk_test_your',
  'your_card_integration',
];

function isPaymobPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PAYMOB_PLACEHOLDERS.some((p) => value.toLowerCase().includes(p));
}

if (
  isPaymobPlaceholder(process.env.PAYMOB_SECRET_KEY) ||
  isPaymobPlaceholder(process.env.PAYMOB_PUBLIC_KEY) ||
  isPaymobPlaceholder(process.env.PAYMOB_HMAC_SECRET) ||
  isPaymobPlaceholder(process.env.PAYMOB_INTEGRATION_ID)
) {
  console.warn(
    '[PayMob] One or more PayMob credentials are missing or set to placeholder values. ' +
    'Card payments will not work. Set PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, ' +
    'PAYMOB_INTEGRATION_ID, and PAYMOB_HMAC_SECRET in your .env file.',
  );
}

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  city: string;
  country: string;
  street: string;
  building: string;
  floor: string;
  apartment: string;
  state: string;
  postal_code: string;
}

export interface PaymobItem {
  name: string;
  amount: number;
  description?: string;
  quantity: number;
}

export interface CreateIntentionParams {
  amountCents: number;
  currency: string;
  integrationId: number;
  items: PaymobItem[];
  billingData: PaymobBillingData;
  specialReference: string;
  notificationUrl: string;
  redirectionUrl: string;
}

export interface PaymobIntention {
  id: string;
  client_secret: string;
  intention_order_id: number;
  payment_keys: Array<{ key: string; integration: number; order_id: number }>;
}

export async function createIntention(params: CreateIntentionParams): Promise<PaymobIntention> {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  if (!secretKey) throw new Error("PAYMOB_SECRET_KEY is not set");

  const res = await fetch(`${PAYMOB_BASE}/v1/intention/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${secretKey}`,
    },
    body: JSON.stringify({
      amount: params.amountCents,
      currency: params.currency,
      payment_methods: [params.integrationId],
      items: params.items,
      billing_data: params.billingData,
      special_reference: params.specialReference,
      notification_url: params.notificationUrl,
      redirection_url: params.redirectionUrl,
      expiration: 3600,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PayMob intention creation failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<PaymobIntention>;
}

export function buildCheckoutUrl(clientSecret: string): string {
  const publicKey = process.env.PAYMOB_PUBLIC_KEY;
  if (!publicKey) throw new Error("PAYMOB_PUBLIC_KEY is not set");
  return `${PAYMOB_BASE}/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}`;
}

// HMAC verification for transaction callbacks (POST)
// Keys must be in this exact lexicographic order per PayMob docs
export function verifyHmac(obj: Record<string, any>, receivedHmac: string): boolean {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) throw new Error("PAYMOB_HMAC_SECRET is not set");

  const fields = [
    String(obj.amount_cents ?? ""),
    String(obj.created_at ?? ""),
    String(obj.currency ?? ""),
    String(obj.error_occured ?? ""),
    String(obj.has_parent_transaction ?? ""),
    String(obj.id ?? ""),
    String(obj.integration_id ?? ""),
    String(obj.is_3d_secure ?? ""),
    String(obj.is_auth ?? ""),
    String(obj.is_capture ?? ""),
    String(obj.is_refunded ?? ""),
    String(obj.is_standalone_payment ?? ""),
    String(obj.is_voided ?? ""),
    String(obj.order?.id ?? ""),
    String(obj.owner ?? ""),
    String(obj.pending ?? ""),
    String(obj.source_data?.pan ?? ""),
    String(obj.source_data?.sub_type ?? ""),
    String(obj.source_data?.type ?? ""),
    String(obj.success ?? ""),
  ];

  const concatenated = fields.join("");
  const calculated = crypto
    .createHmac("sha512", hmacSecret)
    .update(concatenated)
    .digest("hex");

  // Use constant-time comparison to prevent timing-based side-channel attacks
  if (calculated.length !== receivedHmac.length) return false;
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(receivedHmac, 'hex'));
}
