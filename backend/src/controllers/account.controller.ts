import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { UserAuthRequest } from "./userAuth.controller";
import { hashPassword, comparePassword, validatePasswordStrength } from "../services/userAuth.service";
import { sendPasswordChangeEmail } from "../services/email.service";
import { securityLogger } from "../lib/security-logger";

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  // Full strength validation is done by validatePasswordStrength below;
  // min(1) here just rejects empty strings before that call.
  newPassword: z.string().min(1),
});

const addressSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("Lebanon"),
  phone: z.string().optional(),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

// Profile
export async function getProfile(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        addresses: true,
        settings: true,
        _count: {
          select: { wishlist: true, orders: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        addresses: user.addresses,
        settings: user.settings,
        stats: {
          wishlistCount: user._count.wishlist,
          orderCount: user._count.orders,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function requestPasswordChange(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) { res.status(401).json({ error: "Current password is incorrect" }); return; }

    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) { res.status(400).json({ error: strengthCheck.message }); return; }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const newHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { pendingPasswordHash: newHash, pendingPasswordToken: token, pendingPasswordTokenExpiry: expiry },
    });

    await sendPasswordChangeEmail(user.email, token, user.firstName);

    securityLogger.info("Password change requested", { userId: user.id });
    res.json({ success: true, message: "A confirmation link has been sent to your email. Click it to apply the new password." });
  } catch (err) {
    next(err);
  }
}

export async function confirmPasswordChange(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.query);

    const user = await prisma.user.findUnique({ where: { pendingPasswordToken: token } });

    if (!user || !user.pendingPasswordHash) {
      res.status(400).json({ error: "Invalid or expired password change link." });
      return;
    }
    if (!user.pendingPasswordTokenExpiry || user.pendingPasswordTokenExpiry < new Date()) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pendingPasswordHash: null, pendingPasswordToken: null, pendingPasswordTokenExpiry: null },
      });
      res.status(400).json({ error: "This link has expired. Please request a new password change." });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: user.pendingPasswordHash,
        passwordChangedAt: new Date(),
        pendingPasswordHash: null,
        pendingPasswordToken: null,
        pendingPasswordTokenExpiry: null,
      },
    });

    securityLogger.info("Password change confirmed", { userId: user.id });
    res.json({ success: true, message: "Your password has been updated successfully." });
  } catch (err) {
    next(err);
  }
}

// Addresses
export async function getAddresses(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const addresses = await prisma.address.findMany({
      where: { userId: req.user.userId },
      orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "desc" }],
    });

    res.json({ addresses });
  } catch (err) {
    next(err);
  }
}

export async function createAddress(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const data = addressSchema.parse(req.body);

    // Wrap default-unsetting and creation in a transaction to prevent race conditions
    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefaultShipping || data.isDefaultBilling) {
        await tx.address.updateMany({
          where: { userId: req.user!.userId },
          data: {
            isDefaultShipping: data.isDefaultShipping ? false : undefined,
            isDefaultBilling: data.isDefaultBilling ? false : undefined,
          },
        });
      }
      return tx.address.create({ data: { userId: req.user!.userId, ...data } });
    });

    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
}

export async function updateAddress(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;
    const data = addressSchema.partial().parse(req.body);

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Address not found" });
      return;
    }

    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefaultShipping || data.isDefaultBilling) {
        await tx.address.updateMany({
          where: { userId: req.user!.userId, NOT: { id } },
          data: {
            isDefaultShipping: data.isDefaultShipping ? false : undefined,
            isDefaultBilling: data.isDefaultBilling ? false : undefined,
          },
        });
      }
      return tx.address.update({ where: { id }, data });
    });

    res.json({ address });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Address not found" });
      return;
    }

    await prisma.address.delete({ where: { id } });

    res.json({ message: "Address deleted" });
  } catch (err) {
    next(err);
  }
}

// Wishlist
export async function getWishlist(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            images: true,
            status: true,
            category: {
              select: { name: true, slug: true },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    res.json({
      items: items.map((item) => ({
        id: item.id,
        addedAt: item.addedAt,
        variantId: item.variantId,
        product: item.product,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function addToWishlist(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const schema = z.object({
      productId: z.string(),
      variantId: z.string().optional(),
    });

    const { productId, variantId } = schema.parse(req.body);

    // Verify product exists before adding to wishlist
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId: req.user.userId,
        productId,
        variantId: variantId || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
          },
        },
      },
    });

    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      res.status(409).json({ error: "Item already in wishlist" });
      return;
    }
    next(err);
  }
}

export async function removeFromWishlist(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.wishlistItem.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    await prisma.wishlistItem.delete({ where: { id } });

    res.json({ message: "Removed from wishlist" });
  } catch (err) {
    next(err);
  }
}

// Helper to parse images
function parseProductImages(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// Orders
export async function getOrders(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const orders = await prisma.order.findMany({
      where: { userId: req.user.userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
            variant: true,
          },
        },
        shippingAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Parse images for each product
    const ordersWithParsedImages = orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          images: parseProductImages(item.product.images),
        },
      })),
    }));

    res.json({ orders: ordersWithParsedImages });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req: UserAuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, userId: req.user.userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        shippingAddress: true,
        billingAddress: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Parse images for each product
    const orderWithParsedImages = {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          images: parseProductImages(item.product.images),
        },
      })),
    };

    res.json({ order: orderWithParsedImages });
  } catch (err) {
    next(err);
  }
}
