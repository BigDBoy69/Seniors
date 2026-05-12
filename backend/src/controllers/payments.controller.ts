import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { verifyUserToken } from "../services/userAuth.service";
import { createIntention, buildCheckoutUrl, verifyHmac } from "../services/paymob.service";
import { generateOrderNumber } from "../lib/utils";
import { cache } from "../lib/cache";
import { sendOrderConfirmationEmail } from "../services/email.service";
import { securityLogger } from "../lib/security-logger";

// ─── Initiate payment (create order + PayMob intention) ───────────────────────

const initiateSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email("Please enter a valid email"),
  phone: z.string().min(7),
  city: z.string().min(2),
  area: z.string().optional(),
  address: z.string().min(5),
  notes: z.string().optional(),
  deliveryNotes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string().nullable(),
      name: z.string(),
      price: z.number().positive(),
      quantity: z.number().int().positive(),
      size: z.string().nullable().optional(),
      color: z.string().nullable().optional(),
    })
  ).min(1),
  subtotal: z.number().positive(),
  total: z.number().positive(),
  currency: z.string().default("USD"),
});

export async function initiatePayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = initiateSchema.parse(req.body);

    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        userId = verifyUserToken(authHeader.substring(7)).userId;
      } catch {
        // continue as guest
      }
    }

    // Fetch products and verify availability; also get authoritative prices (CW-01 fix)
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, variants: { select: { id: true, stock: true, reserved: true } } },
    });

    if (products.length !== productIds.length) {
      res.status(400).json({ error: "One or more products are no longer available." });
      return;
    }

    // Build server-authoritative price map
    const priceMap = new Map<string, number>(products.map((p) => [p.id, p.price]));

    for (const item of data.items) {
      if (!item.variantId) continue;
      const variant = products.find((p) => p.id === item.productId)?.variants.find((v) => v.id === item.variantId);
      if (variant) {
        const available = variant.stock - variant.reserved;
        if (available < item.quantity) {
          res.status(400).json({ error: `Not enough stock for "${item.name}". Only ${available} available.` });
          return;
        }
      }
    }

    // Compute totals server-side; reject if client total does not match
    const serverSubtotal = data.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
      0,
    );
    const serverDeliveryFee = 0;
    const serverTotal = serverSubtotal + serverDeliveryFee;

    if (Math.round(serverTotal * 100) !== Math.round(data.total * 100)) {
      res.status(400).json({
        error: "Order total does not match current prices. Please refresh and try again.",
      });
      return;
    }

    const amountCents = Math.round(serverTotal * 100);
    const integrationId = parseInt(process.env.PAYMOB_INTEGRATION_ID ?? "0");
    if (!integrationId) {
      res.status(500).json({ error: "Payment integration not configured." });
      return;
    }

    const nameParts = data.customerName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";

    const orderNumber = generateOrderNumber();

    const intention = await createIntention({
      amountCents,
      currency: data.currency,
      integrationId,
      items: data.items.map((item) => ({
        name: item.name,
        amount: Math.round((priceMap.get(item.productId) ?? 0) * 100), // authoritative DB price
        description: item.size ? `${item.size}${item.color ? ` / ${item.color}` : ""}` : undefined,
        quantity: item.quantity,
      })),
      billingData: {
        first_name: firstName,
        last_name: lastName,
        email: data.customerEmail,
        phone_number: data.phone,
        city: data.city,
        country: "LB",
        street: data.address,
        building: "N/A",
        floor: "N/A",
        apartment: "N/A",
        state: data.area ?? "N/A",
        postal_code: "N/A",
      },
      specialReference: orderNumber,
      notificationUrl: `${process.env.BACKEND_URL ?? "http://localhost:4000"}/api/payments/webhook`,
      redirectionUrl: `${frontendUrl}/order-confirmed`,
    });

    // Create order + payment + reserve inventory in one transaction
    const { order } = await prisma.$transaction(async (tx) => {
      const customerEmail = data.customerEmail.trim();
      const customer = await tx.customer.upsert({
        where: { phone: data.phone },
        update: { name: data.customerName, email: customerEmail, city: data.city, area: data.area ?? null, address: data.address },
        create: { name: data.customerName, phone: data.phone, email: customerEmail, city: data.city, area: data.area ?? null, address: data.address },
      });

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          customerId: customer.id,
          userId: userId ?? undefined,
          customerName: data.customerName,
          customerEmail,
          phone: data.phone,
          city: data.city,
          area: data.area ?? null,
          address: data.address,
          notes: data.notes ?? null,
          deliveryNotes: data.deliveryNotes ?? null,
          subtotal: serverSubtotal,
          deliveryFee: serverDeliveryFee,
          total: serverTotal,
          paymentMethod: "CARD",
          paymobIntentionId: intention.id,
          paymobOrderId: String(intention.intention_order_id),
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId ?? null,
              name: item.name,
              price: priceMap.get(item.productId)!, // authoritative DB price
              quantity: item.quantity,
              size: item.size ?? null,
              color: item.color ?? null,
            })),
          },
        },
      });

      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          paymobIntentionId: intention.id,
          paymobOrderId: String(intention.intention_order_id),
          amount: amountCents,
          currency: data.currency,
          status: "PENDING",
        },
      });

      // Reserve inventory
      for (const item of data.items) {
        if (!item.variantId) continue;
        await tx.variant.update({
          where: { id: item.variantId },
          data: { reserved: { increment: item.quantity } },
        });
      }

      return { order: newOrder };
    });

    const checkoutUrl = buildCheckoutUrl(intention.client_secret);

    res.json({
      checkoutUrl,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    next(err);
  }
}

// ─── PayMob Webhook (transaction callback) ────────────────────────────────────

export async function handleWebhook(req: Request, res: Response) {
  // PayMob sends HMAC as a query param
  const receivedHmac = req.query.hmac as string;

  if (!receivedHmac) {
    securityLogger.warn("[PayMob Webhook] No HMAC received", { ip: req.ip });
    res.status(400).json({ error: "Missing HMAC" });
    return;
  }

  const body = req.body as { type: string; obj: Record<string, any> };

  if (body?.type !== "TRANSACTION" || !body?.obj) {
    res.json({ received: true });
    return;
  }

  const txn = body.obj;

  // Verify HMAC
  let hmacValid = false;
  try {
    hmacValid = verifyHmac(txn, receivedHmac);
  } catch (err) {
    securityLogger.error("[PayMob Webhook] HMAC verification error", { error: (err as Error).message });
    res.status(400).json({ error: "HMAC verification failed" });
    return;
  }

  if (!hmacValid) {
    securityLogger.warn("[PayMob Webhook] Invalid HMAC", { ip: req.ip, txnId: String(txn.id) });
    res.status(400).json({ error: "Invalid HMAC" });
    return;
  }

  const transactionId = String(txn.id);

  // Idempotency: check if already processed
  const existing = await prisma.paymentEvent.findUnique({
    where: { paymobTransactionId: transactionId },
  });

  if (existing?.processed) {
    securityLogger.info("[PayMob Webhook] Already processed", { transactionId });
    res.json({ received: true });
    return;
  }

  // Record event
  await prisma.paymentEvent.upsert({
    where: { paymobTransactionId: transactionId },
    create: {
      paymobTransactionId: transactionId,
      eventType: txn.success ? "SUCCEEDED" : "FAILED",
      payload: JSON.stringify(body),
      processed: false,
    },
    update: {
      processingAttempts: { increment: 1 },
    },
  });

  // Find payment by PayMob order ID
  const paymobOrderId = String(txn.order?.id ?? "");
  const payment = await prisma.payment.findFirst({
    where: { paymobOrderId },
    include: { order: { include: { items: true } } },
  });

  if (!payment) {
    securityLogger.warn("[PayMob Webhook] No payment found", { paymobOrderId, transactionId });
    // Mark as processed anyway so we don't retry
    await prisma.paymentEvent.update({
      where: { paymobTransactionId: transactionId },
      data: { processed: true, processedAt: new Date() },
    });
    res.json({ received: true });
    return;
  }

  try {
    if (txn.success === true && !txn.error_occured && !txn.is_voided && !txn.is_refunded) {
      await handlePaymentSucceeded(payment, txn, transactionId);
    } else if (txn.error_occured === true || txn.success === false) {
      await handlePaymentFailed(payment, txn, transactionId);
    }

    await prisma.paymentEvent.update({
      where: { paymobTransactionId: transactionId },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (err) {
    securityLogger.error("[PayMob Webhook] Error processing transaction", { transactionId, error: (err as Error).message });
    res.status(500).json({ error: "Processing failed" });
    return;
  }

  res.json({ received: true });
}

// ─── Webhook handlers ─────────────────────────────────────────────────────────

async function handlePaymentSucceeded(payment: any, txn: any, transactionId: string) {
  // Idempotent: skip if already succeeded
  if (payment.status === "SUCCEEDED") {
    securityLogger.info("[PayMob] Payment already succeeded", { paymentId: payment.id });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        paymobTransactionId: transactionId,
        cardBrand: txn.source_data?.sub_type ?? null,
        cardLast4: txn.source_data?.pan ?? null,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "CONFIRMED", paymentStatus: "PAID" },
    });

    // Finalize inventory
    for (const item of payment.order.items) {
      if (!item.variantId) continue;
      await tx.variant.update({
        where: { id: item.variantId },
        data: {
          stock: { decrement: item.quantity },
          reserved: { decrement: item.quantity },
        },
      });

      // Mark product SOLD_OUT if out of stock
      const allVariants = await tx.variant.findMany({ where: { productId: item.productId } });
      if (allVariants.reduce((s: number, v: any) => s + v.stock, 0) <= 0) {
        await tx.product.update({ where: { id: item.productId }, data: { status: "SOLD_OUT" } });
      }
    }
  });

  await cache.clearPattern("products:.*");
  securityLogger.info("[PayMob] Payment succeeded", { orderNumber: payment.order.orderNumber });

  // Send order confirmation email for card payments (best-effort, non-blocking)
  await sendOrderConfirmationEmail({
    orderNumber: payment.order.orderNumber,
    customerName: payment.order.customerName,
    customerEmail: payment.order.customerEmail,
    total: payment.order.total,
    subtotal: payment.order.subtotal,
    deliveryFee: payment.order.deliveryFee,
    paymentMethod: "CARD",
    status: "CONFIRMED",
    paymentStatus: "PAID",
    items: payment.order.items.map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      size: i.size,
      color: i.color,
    })),
  });
}

async function handlePaymentFailed(payment: any, txn: any, transactionId: string) {
  if (payment.status === "FAILED") return;

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        paymobTransactionId: transactionId,
        failureReason: txn.data?.message ?? txn.data?.txn_response_code ?? "Payment failed",
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED" },
    });

    // Release reserved inventory
    for (const item of payment.order.items) {
      if (!item.variantId) continue;
      await tx.variant.update({
        where: { id: item.variantId },
        data: { reserved: { decrement: item.quantity } },
      });
    }
  });

  securityLogger.warn("[PayMob] Payment failed", { orderNumber: payment.order.orderNumber });
}
