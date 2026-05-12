import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { cache, buildCacheKey } from "../lib/cache";


function parseImages(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function withParsedImages<T extends { images: string | string[] }>(p: T) {
  return { ...p, images: parseImages(p.images) };
}

const VALID_STATUSES = ["ACTIVE", "DRAFT", "SOLD_OUT", "ARCHIVED", "AVAILABLE", "LIMITED", "COMING_SOON", "PRE_ORDER"] as const;
type ProductStatus = typeof VALID_STATUSES[number];

function parseStatus(s: unknown): ProductStatus | undefined {
  if (typeof s === "string" && VALID_STATUSES.includes(s as ProductStatus)) {
    return s as ProductStatus;
  }
  return undefined;
}

// Coerces empty/whitespace strings to null — used for all ProductInfo text fields
function nullIfBlank(v: string | null | undefined): string | null {
  return (v?.trim()) || null;
}

const infoInputSchema = z.object({
  subtitle:         z.string().nullish().transform(nullIfBlank),
  material:         z.string().nullish().transform(nullIfBlank),
  productDetails:   z.string().nullish().transform(nullIfBlank),
  collectionNote:   z.string().nullish().transform(nullIfBlank),
  sizeGuideType:    z.string().nullish().transform(v => {
    const t = v?.trim();
    return t === "text" || t === "url" ? t : null;
  }),
  sizeGuideContent: z.string().nullish().transform(nullIfBlank),
  sizeGuideUrl:     z.string().nullish().transform(nullIfBlank),
  deliveryInfo:     z.string().nullish().transform(nullIfBlank),
  shippingInfo:     z.string().nullish().transform(nullIfBlank),
  returnsInfo:      z.string().nullish().transform(nullIfBlank),
  infoCardTitle:    z.string().nullish().transform(nullIfBlank),
  infoCardBody:     z.string().nullish().transform(nullIfBlank),
  infoCardImage:    z.string().nullish().transform(nullIfBlank),
  infoCardCtaLabel: z.string().nullish().transform(nullIfBlank),
  infoCardCtaUrl:   z.string().nullish().transform(nullIfBlank),
}).optional();

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { category, size, status, sort, featured, division, newArrivals, search } = req.query;

    const cacheKey = buildCacheKey("products:list", {
      category, size, status, sort, featured, division, newArrivals,
      // Don't cache search queries — they're ad-hoc and bypass cache naturally
      ...(search ? { search } : {}),
    });

    const cached = !search ? await cache.get(cacheKey) : null;
    if (cached) {
      return res.json({ products: cached, fromCache: true });
    }

    const orderBy = (() => {
      switch (sort) {
        case "price-asc":  return { price: "asc"  as const };
        case "price-desc": return { price: "desc" as const };
        case "name-asc":   return { name:  "asc"  as const };
        case "manual":     return { sortOrder: "asc" as const };
        default:           return [{ sortOrder: "asc" as const }, { createdAt: "desc" as const }];
      }
    })();

    const searchTerm = typeof search === "string" && search.trim().length > 0
      ? search.trim()
      : null;

    const products = await prisma.product.findMany({
      where: {
        status: { notIn: ["ARCHIVED", "DRAFT"] },
        ...(parseStatus(status) && { status: parseStatus(status) }),
        ...(typeof category === "string" && { category: { slug: category } }),
        ...(searchTerm && {
          OR: [
            { name: { contains: searchTerm, mode: "insensitive" } },
            { description: { contains: searchTerm, mode: "insensitive" } },
            { category: { name: { contains: searchTerm, mode: "insensitive" } } },
          ],
        }),
        ...(typeof division === "string" && { division: { key: division } }),
        ...(newArrivals === "true" && { isNewArrival: true }),
        ...(typeof size === "string" && { variants: { some: { size } } }),
        ...(featured === "true" && { featured: true }),
      },
      include: { variants: true, category: true },
      orderBy,
    });

    const result = products.map(withParsedImages);
    await cache.set(cacheKey, result, 300);

    res.json({ products: result });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const cacheKey = `products:slug:${req.params.slug}`;
    const cached = await cache.get<{ product: unknown; policy: unknown }>(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    const [product, settings] = await Promise.all([
      prisma.product.findUnique({
        where: { slug: req.params.slug },
        include: { variants: true, category: true, productInfo: true },
      }),
      prisma.siteSettings.findUnique({ where: { id: "site" } }),
    ]);

    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    const policy = {
      defaultDeliveryInfo: settings?.defaultDeliveryInfo ?? null,
      defaultShippingInfo: settings?.defaultShippingInfo ?? null,
      defaultReturnsInfo:  settings?.defaultReturnsInfo  ?? null,
    };

    const result = { product: withParsedImages(product), policy };
    await cache.set(cacheKey, result, 300);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const cacheKey = "products:meta";
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, fromCache: true });
    }

    const categories = await prisma.category.findMany({
      where: { visible: true },
      include: { division: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    const variants = await prisma.variant.findMany({ select: { size: true, color: true } });

    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL"];
    const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean) as string[])].sort(
      (a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b)
    );
    const colors = [...new Set(variants.map((v) => v.color).filter(Boolean) as string[])].sort();

    const result = { categories, sizes, colors };
    await cache.set(cacheKey, result, 600);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

const variantInputSchema = z.object({
  id: z.string().optional(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  colorHex: z.string().nullable().optional(),
  stock: z.number().int().min(0).default(0),
  reserved: z.number().int().min(0).default(0),
  sku: z.string().nullable().optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().nullable().optional(),
  images: z.array(z.string()).default([]),
  divisionId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  fabric: z.string().optional(),
  careInstructions: z.string().optional(),
  fitNotes: z.string().optional(),
  status: z.enum(VALID_STATUSES).default("ACTIVE"),
  featured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  variants: z.array(variantInputSchema).default([]),
  info: infoInputSchema,
});

async function upsertProductInfo(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
  productId: string,
  info: NonNullable<z.infer<typeof infoInputSchema>>
) {
  await tx.productInfo.upsert({
    where: { productId },
    create: { productId, ...info },
    update: info,
  });
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.parse(req.body);
    const { images, variants, info, ...rest } = data;
    const dbData: Prisma.ProductUncheckedCreateInput = {
      ...rest,
      images: JSON.stringify(images ?? []),
      categoryId: rest.categoryId ?? undefined,
      divisionId: rest.divisionId ?? undefined,
      variants: {
        create: variants.map((variant) => ({
          size: variant.size ?? null,
          color: variant.color ?? null,
          colorHex: variant.colorHex ?? null,
          stock: variant.stock,
          reserved: variant.reserved,
          sku: variant.sku ?? null,
        })),
      },
    };
    const product = await prisma.product.create({ data: dbData, include: { variants: true, category: true } });

    if (info) {
      await prisma.productInfo.create({ data: { productId: product.id, ...info } });
    }

    await cache.clearPattern("products:.*");

    const full = await prisma.product.findUnique({
      where: { id: product.id },
      include: { variants: true, category: true, productInfo: true },
    });
    res.status(201).json({ product: withParsedImages(full!) });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = productSchema.partial().parse(req.body);
    const { images, variants, info, ...rest } = data;
    const dbData: Prisma.ProductUncheckedUpdateInput = {
      ...rest,
      ...(images ? { images: JSON.stringify(images) } : {}),
      categoryId: rest.categoryId ?? undefined,
      divisionId: rest.divisionId ?? undefined,
    };
    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: req.params.id },
        data: dbData,
      });
      if (variants) {
        await tx.variant.deleteMany({ where: { productId: req.params.id } });
        if (variants.length > 0) {
          await tx.variant.createMany({
            data: variants.map((variant) => ({
              productId: req.params.id,
              size: variant.size ?? null,
              color: variant.color ?? null,
              colorHex: variant.colorHex ?? null,
              stock: variant.stock ?? 0,
              reserved: variant.reserved ?? 0,
              sku: variant.sku ?? null,
            })),
          });
        }
      }
      if (info !== undefined) {
        await upsertProductInfo(tx, req.params.id, info ?? {});
      }
      return tx.product.findUnique({
        where: { id: req.params.id },
        include: { variants: true, category: true, productInfo: true },
      });
    });

    await cache.clearPattern("products:.*");

    res.json({ product: product ? withParsedImages(product) : null });
  } catch (err) {
    next(err);
  }
}

export async function archiveProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { status: "ARCHIVED" } });
    await cache.clearPattern("products:.*");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function unarchiveProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { status: "DRAFT" } });
    await cache.clearPattern("products:.*");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function adminListProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await prisma.product.findMany({
      include: { variants: true, category: true, division: true, productInfo: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    res.json({ products: products.map(withParsedImages) });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    await cache.clearPattern("products:.*");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
