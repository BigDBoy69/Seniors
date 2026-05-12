import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { generateOrderNumber } from "../lib/utils";
import { verifyUserToken } from "../services/userAuth.service";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "../services/email.service";
import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().nullable(),
  name: z.string(),
  // price is accepted from the client for display purposes only;
  // the server re-fetches and uses the authoritative DB price.
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

const createOrderSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().min(7),
  city: z.string().min(2),
  area: z.string().optional(),
  address: z.string().min(5),
  notes: z.string().optional(),
  deliveryNotes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
  subtotal: z.number().positive(),
  total: z.number().positive(),
});

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createOrderSchema.parse(req.body);

    // Resolve userId via JWT only — no email-based fallback (CW-04 fix)
    let userId: string | null = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const payload = verifyUserToken(token);
        userId = payload.userId;
      } catch {
        // Invalid/expired JWT — order proceeds as guest
      }
    }

    // Verify products exist and fetch authoritative prices (CW-01 fix)
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

    // Check variant stock
    for (const item of data.items) {
      if (!item.variantId) continue;
      const product = products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (variant) {
        const available = variant.stock - variant.reserved;
        if (available < item.quantity) {
          res.status(400).json({
            error: `Not enough stock for "${item.name}" (${item.size ?? ""} ${item.color ?? ""}). Only ${available} available.`,
          });
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

    const order = await prisma.$transaction(async (tx) => {
      const customerEmail = data.customerEmail && data.customerEmail.trim() !== "" ? data.customerEmail.trim() : null;

      const customer = await tx.customer.upsert({
        where: { phone: data.phone },
        update: {
          name: data.customerName,
          email: customerEmail,
          city: data.city,
          area: data.area ?? null,
          address: data.address,
          notes: data.notes ?? null,
        },
        create: {
          name: data.customerName,
          phone: data.phone,
          email: customerEmail,
          city: data.city,
          area: data.area ?? null,
          address: data.address,
          notes: data.notes ?? null,
        },
      });

      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          status: "PENDING",
          customerId: customer.id,
          userId: userId,
          customerName: data.customerName,
          customerEmail: customerEmail,
          phone: data.phone,
          city: data.city,
          area: data.area ?? null,
          address: data.address,
          notes: data.notes ?? null,
          deliveryNotes: data.deliveryNotes ?? null,
          subtotal: serverSubtotal,
          deliveryFee: serverDeliveryFee,
          total: serverTotal,
          paymentMethod: "CASH_ON_DELIVERY",
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

      for (const item of data.items) {
        if (!item.variantId) continue;
        await tx.variant.update({
          where: { id: item.variantId },
          data: { reserved: { increment: item.quantity } },
        });
      }

      return newOrder;
    });

    res.status(201).json({ orderId: order.id, orderNumber: order.orderNumber });

    // Send confirmation email for COD orders (best-effort, non-blocking)
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    if (orderWithItems) {
      await sendOrderConfirmationEmail({
        orderNumber: orderWithItems.orderNumber,
        customerName: orderWithItems.customerName,
        customerEmail: orderWithItems.customerEmail,
        total: orderWithItems.total,
        subtotal: orderWithItems.subtotal,
        deliveryFee: orderWithItems.deliveryFee,
        paymentMethod: orderWithItems.paymentMethod,
        status: orderWithItems.status,
        paymentStatus: orderWithItems.paymentStatus,
        items: orderWithItems.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          size: i.size,
          color: i.color,
        })),
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Try authenticated user first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyUserToken(authHeader.substring(7));
        // Order must be explicitly linked to this user
        if (!order.userId || order.userId !== payload.userId) {
          res.status(403).json({ error: "Access denied" });
          return;
        }
        res.json({ order });
        return;
      } catch {
        // Invalid/expired token — fall through to phone verification
      }
    }

    // Guest access: require the phone number used when placing the order
    const phone = typeof req.query.phone === 'string' ? req.query.phone.trim() : null;
    if (!phone) {
      res.status(401).json({ error: "Authentication or phone verification required" });
      return;
    }

    if (!order.phone || order.phone.replace(/\s/g, '') !== phone.replace(/\s/g, '')) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Return a limited response for unauth guests — no PII beyond what they already know
    res.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Admin ─────────────────────────────────────────────────────────────────

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;

export async function adminListOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page = "1" } = req.query;
    const perPage = 20;
    const parsedPage = Math.max(1, parseInt(page as string) || 1);
    const skip = (parsedPage - 1) * perPage;

    const validStatus = ORDER_STATUSES.includes(status as typeof ORDER_STATUSES[number])
      ? (status as typeof ORDER_STATUSES[number])
      : undefined;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: validStatus ? { status: validStatus } : undefined,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.order.count({ where: validStatus ? { status: validStatus } : undefined }),
    ]);

    res.json({ orders, total, page: parsedPage, perPage });
  } catch (err) {
    next(err);
  }
}

export async function adminGetOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: { select: { slug: true, images: true } } } } },
    });
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = z.object({
      status: z.enum(ORDER_STATUSES),
    }).parse(req.body);

    const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id: req.params.id }, data: { status } });

      if (status === "CANCELLED" && existing.status !== "CANCELLED") {
        const items = await tx.orderItem.findMany({ where: { orderId: req.params.id } });
        for (const item of items) {
          if (!item.variantId) continue;
          await tx.variant.update({
            where: { id: item.variantId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
      }

      if (status === "DELIVERED" && existing.status !== "DELIVERED") {
        const items = await tx.orderItem.findMany({ where: { orderId: req.params.id } });
        for (const item of items) {
          if (!item.variantId) continue;
          await tx.variant.update({
            where: { id: item.variantId },
            data: {
              stock: { decrement: item.quantity },
              reserved: { decrement: item.quantity },
            },
          });
        }
      }

      return order;
    });

    res.json({ order: updated });

    // Send status update email only when status actually changes (best-effort, non-blocking)
    if (existing.status !== status) {
      await sendOrderStatusUpdateEmail({
        orderNumber: updated.orderNumber,
        customerName: updated.customerName,
        customerEmail: updated.customerEmail,
        status: updated.status,
        previousStatus: existing.status,
      });
    }
  } catch (err) {
    next(err);
  }
}

export async function adminDashboardStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [totalOrders, pendingOrders, confirmedOrders, totalProducts, revenue, recentOrders] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.count({ where: { status: "CONFIRMED" } }),
        prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
        prisma.order.aggregate({
          where: { status: { in: ["CONFIRMED", "OUT_FOR_DELIVERY", "DELIVERED"] } },
          _sum: { total: true },
        }),
        prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { items: true },
        }),
      ]);

    res.json({
      stats: { totalOrders, pendingOrders, confirmedOrders, totalProducts },
      revenue: revenue._sum.total ?? 0,
      recentOrders,
    });
  } catch (err) {
    next(err);
  }
}

// Utility: Link existing orders to user accounts by email
export async function syncOrdersToUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    // Find all orders without userId but with email
    const ordersWithEmail = await prisma.order.findMany({
      where: {
        userId: null,
        customerEmail: { not: null },
      },
      select: { id: true, customerEmail: true },
    });

    let linkedCount = 0;

    for (const order of ordersWithEmail) {
      if (!order.customerEmail) continue;

      // Find matching user account
      const user = await prisma.user.findUnique({
        where: { email: order.customerEmail },
      });

      if (user && user.active) {
        await prisma.order.update({
          where: { id: order.id },
          data: { userId: user.id },
        });
        linkedCount++;
      }
    }

    res.json({
      message: `Successfully linked ${linkedCount} orders to user accounts`,
      totalProcessed: ordersWithEmail.length,
      linked: linkedCount,
    });
  } catch (err) {
    next(err);
  }
}
