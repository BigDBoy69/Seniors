import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { hashPassword } from "../services/auth.service";
import { cache } from "../lib/cache";
import { logAdminAction } from "../lib/security-logger";
import { AuthRequest } from "../middleware/auth";

const divisionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  intro: z.string().min(1),
  image: z.string().nullable().optional(),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const collectionSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  intro: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  divisionId: z.string().nullable().optional(),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  productIds: z.array(z.string()).default([]),
});

const navigationItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  path: z.string().min(1),
  location: z.string().min(1),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  openInNewTab: z.boolean().default(false),
});

const homeContentSchema = z.object({
  heroHeading: z.string().min(1),
  heroSubtext: z.string().nullable().optional(),
  heroImage: z.string().nullable().optional(),
  heroButtonText: z.string().min(1),
  heroButtonLink: z.string().min(1),
  showFeatured: z.boolean(),
  showNewsletter: z.boolean(),
  newsletterLabel: z.string().min(1),
  newsletterHeading: z.string().min(1),
  newsletterSubtext: z.string().nullable().optional(),
});

const homeSectionSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  label: z.string().nullable().optional(),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaLink: z.string().nullable().optional(),
  visible: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  sectionType: z.string().default("FEATURED_PRODUCTS"),
  productIds: z.array(z.string()).default([]),
});

const siteSettingsSchema = z.object({
  newsletterLabel: z.string().min(1),
  newsletterHeading: z.string().min(1),
  newsletterText: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  tiktokUrl: z.string().nullable().optional(),
  defaultDeliveryInfo: z.string().nullable().optional(),
  defaultShippingInfo: z.string().nullable().optional(),
  defaultReturnsInfo: z.string().nullable().optional(),
});

const mediaAssetSchema = z.object({
  title: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  url: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  source: z.string().default("EXTERNAL"),
  size: z.number().int().nullable().optional(),
});

const adminUserSchema = z.object({
  email: z.string().email().max(254).transform(v => v.toLowerCase().trim()),
  name: z.string().min(2).max(100),
  password: z.string().min(12).max(128).optional().refine(
    val => val === undefined || (
      /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val) && /[^A-Za-z0-9]/.test(val)
    ),
    { message: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character' }
  ),
  role: z.enum(['ADMIN', 'MANAGER', 'EDITOR']).default("EDITOR"),
  active: z.boolean().default(true),
});

function parseImages(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getStorefrontConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const [navigation, settings, homepage, divisions] = await Promise.all([
      prisma.navigationItem.findMany({ where: { visible: true }, orderBy: [{ location: "asc" }, { sortOrder: "asc" }] }),
      prisma.siteSettings.upsert({ where: { id: "site" }, update: {}, create: { id: "site" } }),
      prisma.homePageContent.upsert({
        where: { id: "homepage" },
        update: {},
        create: { id: "homepage" },
        include: {
          sections: {
            where: { visible: true },
            orderBy: { sortOrder: "asc" },
            include: {
              products: {
                orderBy: { sortOrder: "asc" },
                include: { product: { include: { variants: true, category: true, division: true } } },
              },
            },
          },
        },
      }),
      prisma.division.findMany({
        where: { visible: true },
        orderBy: { sortOrder: "asc" },
        include: { categories: { where: { visible: true }, orderBy: { sortOrder: "asc" } } },
      }),
    ]);

    const formattedSections = homepage.sections.map((section) => ({
      ...section,
      products: section.products.map((entry) => ({
        ...entry.product,
        images: parseImages(entry.product.images),
      })),
    }));

    res.json({
      navigation,
      settings,
      homepage: { ...homepage, sections: formattedSections },
      divisions,
    });
  } catch (err) {
    next(err);
  }
}

export async function getCatalogDivision(req: Request, res: Response, next: NextFunction) {
  try {
    const division = await prisma.division.findUnique({
      where: { key: req.params.key },
      include: {
        categories: { where: { visible: true }, orderBy: { sortOrder: "asc" } },
        collections: { where: { visible: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    // Only 404 if the division genuinely does not exist in the database.
    // A hidden division (visible: false) still returns its data so that
    // category pages under it can render gracefully rather than clearing products.
    if (!division) {
      res.status(404).json({ error: "Division not found" });
      return;
    }
    res.json({ division });
  } catch (err) {
    next(err);
  }
}

export async function adminDashboardOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const [counts, recentOrders, lowStock] = await Promise.all([
      Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.collection.count(),
        prisma.order.count(),
        prisma.customer.count(),
      ]),
      prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.variant.findMany({
        where: { stock: { lte: 2 } },
        include: { product: { select: { name: true } } },
        take: 10,
      }),
    ]);
    res.json({
      metrics: {
        products: counts[0],
        categories: counts[1],
        collections: counts[2],
        orders: counts[3],
        customers: counts[4],
      },
      recentOrders,
      lowStock,
    });
  } catch (err) {
    next(err);
  }
}

export async function listDivisions(_req: Request, res: Response, next: NextFunction) {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { sortOrder: "asc" },
      include: { categories: { orderBy: { sortOrder: "asc" } } },
    });
    res.json({ divisions });
  } catch (err) {
    next(err);
  }
}

export async function createDivision(req: Request, res: Response, next: NextFunction) {
  try {
    const data = divisionSchema.parse(req.body);
    const division = await prisma.division.create({ data: { ...data, image: data.image ?? null } });
    await cache.clearPattern("products:.*");
    res.status(201).json({ division });
  } catch (err) {
    next(err);
  }
}

export async function updateDivision(req: Request, res: Response, next: NextFunction) {
  try {
    const data = divisionSchema.partial().parse(req.body);
    const division = await prisma.division.update({
      where: { id: req.params.id },
      data: { ...data, image: data.image ?? undefined },
    });
    await cache.clearPattern("products:.*");
    res.json({ division });
  } catch (err) {
    next(err);
  }
}

export async function deleteDivision(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.$transaction(async (tx) => {
      // Unlink products from the division before deletion to avoid FK constraint errors.
      await tx.product.updateMany({
        where: { divisionId: req.params.id },
        data: { divisionId: null },
      });
      // Unlink categories from the division before deletion.
      await tx.category.updateMany({
        where: { divisionId: req.params.id },
        data: { divisionId: null },
      });
      // Unlink collections from the division before deletion.
      await tx.collection.updateMany({
        where: { divisionId: req.params.id },
        data: { divisionId: null },
      });
      await tx.division.delete({ where: { id: req.params.id } });
    });
    await cache.clearPattern("products:.*");
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listCategoriesAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      include: { division: true, _count: { select: { products: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: {
        ...data,
        description: data.description ?? null,
        image: data.image ?? null,
        divisionId: data.divisionId ?? null,
      },
      include: { division: true },
    });
    await cache.clearPattern("products:.*");
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...data,
        description: data.description ?? undefined,
        image: data.image ?? undefined,
        divisionId: data.divisionId ?? undefined,
      },
      include: { division: true },
    });
    await cache.clearPattern("products:.*");
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { action, targetCategoryId } = req.body;

    // Check if category has products
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const productCount = category._count.products;

    // If category has products, require explicit action
    if (productCount > 0) {
      if (!action) {
        res.status(400).json({
          error: "Category has products",
          productCount,
          message: `Cannot delete category "${category.name}" because it has ${productCount} product(s). Use action: 'reassign' with targetCategoryId, or action: 'unassign' to remove category from products.`,
        });
        return;
      }

      if (action === 'reassign') {
        if (!targetCategoryId) {
          res.status(400).json({ error: "targetCategoryId required for reassign action" });
          return;
        }

        // Verify target category exists and is different
        if (targetCategoryId === req.params.id) {
          res.status(400).json({ error: "Cannot reassign to the same category" });
          return;
        }

        const targetCategory = await prisma.category.findUnique({
          where: { id: targetCategoryId },
        });

        if (!targetCategory) {
          res.status(404).json({ error: "Target category not found" });
          return;
        }

        // Reassign all products to target category
        await prisma.product.updateMany({
          where: { categoryId: req.params.id },
          data: { categoryId: targetCategoryId },
        });
      } else if (action === 'unassign') {
        // Remove category from all products
        await prisma.product.updateMany({
          where: { categoryId: req.params.id },
          data: { categoryId: null },
        });
      } else {
        res.status(400).json({ error: "Invalid action. Use 'reassign' or 'unassign'" });
        return;
      }
    }

    // Now safe to delete the category
    await prisma.category.delete({ where: { id: req.params.id } });
    await cache.clearPattern("products:.*");
    res.json({ success: true, productCount, action: action || 'none' });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryProductCount(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { products: true } },
        products: {
          select: { id: true, name: true, slug: true },
          take: 5,
        },
      },
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json({
      categoryId: category.id,
      categoryName: category.name,
      productCount: category._count.products,
      sampleProducts: category.products,
    });
  } catch (err) {
    next(err);
  }
}

export async function listCollections(req: Request, res: Response, next: NextFunction) {
  try {
    const { visibleOnly } = req.query;
    const collections = await prisma.collection.findMany({
      where: visibleOnly === "true" ? { visible: true } : undefined,
      include: {
        division: true,
        products: {
          include: { product: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ collections });
  } catch (err) {
    next(err);
  }
}

export async function createCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const data = collectionSchema.parse(req.body);
    const { productIds, ...rest } = data;
    const collection = await prisma.$transaction(async (tx) => {
      const created = await tx.collection.create({
        data: {
          ...rest,
          intro: rest.intro ?? null,
          image: rest.image ?? null,
          divisionId: rest.divisionId ?? null,
        },
      });
      if (productIds.length) {
        await tx.collectionProduct.createMany({
          data: productIds.map((productId, index) => ({
            collectionId: created.id,
            productId,
            sortOrder: index + 1,
          })),
        });
      }
      return tx.collection.findUnique({
        where: { id: created.id },
        include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } }, division: true },
      });
    });
    res.status(201).json({ collection });
  } catch (err) {
    next(err);
  }
}

export async function updateCollection(req: Request, res: Response, next: NextFunction) {
  try {
    const data = collectionSchema.partial().parse(req.body);
    const { productIds, ...rest } = data;
    const collection = await prisma.$transaction(async (tx) => {
      await tx.collection.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          intro: rest.intro ?? undefined,
          image: rest.image ?? undefined,
          divisionId: rest.divisionId ?? undefined,
        },
      });
      if (productIds) {
        await tx.collectionProduct.deleteMany({ where: { collectionId: req.params.id } });
        if (productIds.length > 0) {
          await tx.collectionProduct.createMany({
            data: productIds.map((productId, index) => ({
              collectionId: req.params.id,
              productId,
              sortOrder: index + 1,
            })),
          });
        }
      }
      return tx.collection.findUnique({
        where: { id: req.params.id },
        include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } }, division: true },
      });
    });
    res.json({ collection });
  } catch (err) {
    next(err);
  }
}

export async function deleteCollection(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.collection.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getHomepageContent(_req: Request, res: Response, next: NextFunction) {
  try {
    const homepage = await prisma.homePageContent.upsert({
      where: { id: "homepage" },
      update: {},
      create: { id: "homepage" },
      include: {
        sections: {
          orderBy: { sortOrder: "asc" },
          include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
        },
      },
    });
    res.json({ homepage });
  } catch (err) {
    next(err);
  }
}

export async function updateHomepageContent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = homeContentSchema.parse(req.body);
    const homepage = await prisma.homePageContent.upsert({
      where: { id: "homepage" },
      update: data,
      create: { id: "homepage", ...data },
    });
    res.json({ homepage });
  } catch (err) {
    next(err);
  }
}

export async function upsertHomepageSection(req: Request, res: Response, next: NextFunction) {
  try {
    const data = homeSectionSchema.parse(req.body);
    const section = await prisma.$transaction(async (tx) => {
      const saved = await tx.homePageSection.upsert({
        where: { key: data.key },
        update: {
          label: data.label ?? null,
          title: data.title,
          subtitle: data.subtitle ?? null,
          ctaLabel: data.ctaLabel ?? null,
          ctaLink: data.ctaLink ?? null,
          visible: data.visible,
          sortOrder: data.sortOrder,
          sectionType: data.sectionType,
        },
        create: {
          key: data.key,
          label: data.label ?? null,
          title: data.title,
          subtitle: data.subtitle ?? null,
          ctaLabel: data.ctaLabel ?? null,
          ctaLink: data.ctaLink ?? null,
          visible: data.visible,
          sortOrder: data.sortOrder,
          sectionType: data.sectionType,
        },
      });
      await tx.homeSectionProduct.deleteMany({ where: { sectionId: saved.id } });
      if (data.productIds.length) {
        await tx.homeSectionProduct.createMany({
          data: data.productIds.map((productId, index) => ({
            sectionId: saved.id,
            productId,
            sortOrder: index + 1,
          })),
        });
      }
      return tx.homePageSection.findUnique({
        where: { id: saved.id },
        include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
      });
    });
    res.json({ section });
  } catch (err) {
    next(err);
  }
}

export async function deleteHomepageSection(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.homePageSection.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listNavigation(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await prisma.navigationItem.findMany({
      orderBy: [{ location: "asc" }, { sortOrder: "asc" }],
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function upsertNavigationItems(req: Request, res: Response, next: NextFunction) {
  try {
    const items = z.array(navigationItemSchema).parse(req.body.items ?? []);
    const saved = await prisma.$transaction(async (tx) => {
      const existingIds = items.map((item) => item.id).filter(Boolean) as string[];
      await tx.navigationItem.deleteMany({
        where: { id: { notIn: existingIds }, location: { in: [...new Set(items.map((item) => item.location))] } },
      });
      const output = [];
      for (const item of items) {
        if (item.id) {
          output.push(
            await tx.navigationItem.update({
              where: { id: item.id },
              data: item,
            }),
          );
        } else {
          output.push(await tx.navigationItem.create({ data: item }));
        }
      }
      return output;
    });
    res.json({ items: saved });
  } catch (err) {
    next(err);
  }
}

export async function getSiteSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await prisma.siteSettings.upsert({
      where: { id: "site" },
      update: {},
      create: { id: "site" },
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSiteSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = siteSettingsSchema.parse(req.body);
    const settings = await prisma.siteSettings.upsert({
      where: { id: "site" },
      update: data,
      create: { id: "site", ...data },
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function listMedia(_req: Request, res: Response, next: NextFunction) {
  try {
    const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ assets });
  } catch (err) {
    next(err);
  }
}

export async function createMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const data = mediaAssetSchema.parse(req.body);
    const asset = await prisma.mediaAsset.create({ data });
    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedia(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.mediaAsset.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(_req: Request, res: Response, next: NextFunction) {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ customers });
  } catch (err) {
    next(err);
  }
}

export async function listAdminUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ admins });
  } catch (err) {
    next(err);
  }
}

export async function createAdminUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = adminUserSchema.parse(req.body);
    if (!data.password) {
      res.status(400).json({ error: "Password is required for a new admin." });
      return;
    }
    const password = await hashPassword(data.password);
    const admin = await prisma.admin.create({
      data: {
        email: data.email,
        name: data.name,
        password,
        role: data.role,
        active: data.active,
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    const requestingAdmin = (req as AuthRequest).admin;
    logAdminAction(
      requestingAdmin?.adminId || 'unknown',
      'CREATE_ADMIN',
      `admin:${admin.id}`,
      req.ip || 'unknown',
      { newAdminEmail: admin.email, role: admin.role }
    );
    res.status(201).json({ admin });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Prevent self-demotion/deactivation
    const requestingAdmin = (req as AuthRequest).admin;
    if (requestingAdmin?.adminId === req.params.id) {
      const data = adminUserSchema.partial().parse(req.body);
      if (data.active === false || (data.role && data.role !== requestingAdmin.role)) {
        res.status(403).json({ error: "You cannot modify your own role or deactivate your own account" });
        return;
      }
    }

    const data = adminUserSchema.partial().parse(req.body);
    const admin = await prisma.admin.update({
      where: { id: req.params.id },
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        active: data.active,
        ...(data.password ? { password: await hashPassword(data.password) } : {}),
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    logAdminAction(
      requestingAdmin?.adminId || 'unknown',
      'UPDATE_ADMIN',
      `admin:${admin.id}`,
      req.ip || 'unknown',
      { targetAdminEmail: admin.email, passwordChanged: !!data.password }
    );
    res.json({ admin });
  } catch (err) {
    next(err);
  }
}
