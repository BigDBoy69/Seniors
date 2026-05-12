import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.admin.upsert({
    where: { email: "admin@akwaluzto.com" },
    update: {},
    create: {
      email: "admin@akwaluzto.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`  ✓ Admin user created: ${admin.email} (password: admin123)`);

  const divisions = await Promise.all([
    prisma.division.upsert({
      where: { key: "men" },
      update: {},
      create: {
        key: "men",
        title: "Men",
        intro: "Tailored essentials and contemporary silhouettes for everyday wear.",
        image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=1400&q=80",
        sortOrder: 1,
      },
    }),
    prisma.division.upsert({
      where: { key: "women" },
      update: {},
      create: {
        key: "women",
        title: "Women",
        intro: "Editorial pieces balancing softness, structure, and movement.",
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1400&q=80",
        sortOrder: 2,
      },
    }),
    prisma.division.upsert({
      where: { key: "accessories" },
      update: {},
      create: {
        key: "accessories",
        title: "Accessories",
        intro: "Quiet accents designed to complete each look.",
        image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1400&q=80",
        sortOrder: 3,
      },
    }),
    prisma.division.upsert({
      where: { key: "new-arrivals" },
      update: {},
      create: {
        key: "new-arrivals",
        title: "New Arrivals",
        intro: "A rotating edit of the newest pieces across all divisions.",
        sortOrder: 4,
      },
    }),
  ]);
  const men = divisions.find((d) => d.key === "men")!;
  const women = divisions.find((d) => d.key === "women")!;
  const accessories = divisions.find((d) => d.key === "accessories")!;

  const categoriesToSeed = [
    // Men division categories
    { name: "Ready to Wear", slug: "ready-to-wear", divisionId: men.id, sortOrder: 1, description: "Core garments for daily rotation." },
    { name: "Outerwear", slug: "outerwear", divisionId: men.id, sortOrder: 2, description: "Refined layers for cooler days." },
    // Women division categories
    { name: "Tops", slug: "tops", divisionId: women.id, sortOrder: 3, description: "Layering pieces and stand-alone forms." },
    { name: "Bottoms", slug: "bottoms", divisionId: women.id, sortOrder: 4, description: "From precise cuts to fluid drape." },
    { name: "Knitwear", slug: "knitwear", divisionId: women.id, sortOrder: 5, description: "Soft volume and subtle texture." },
    { name: "Shoes", slug: "shoes", divisionId: women.id, sortOrder: 6, description: "Essential pairs for day and evening." },
    // Accessories division categories
    { name: "Bags", slug: "bags", divisionId: accessories.id, sortOrder: 7, description: "Functional silhouettes with premium finish." },
    { name: "Jewellery", slug: "jewellery", divisionId: accessories.id, sortOrder: 8, description: "Minimal pieces with character." },
    { name: "Small Goods", slug: "small-goods", divisionId: accessories.id, sortOrder: 9, description: "Belts, wallets, and other accessories." },
  ];

  const categories = new Map<string, { id: string; slug: string }>();
  for (const c of categoriesToSeed) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, divisionId: c.divisionId, sortOrder: c.sortOrder, description: c.description },
      create: c,
    });
    categories.set(c.slug, category);
  }

  await prisma.homePageContent.upsert({
    where: { id: "homepage" },
    update: {},
    create: {
      id: "homepage",
      heroHeading: "Dressed in Quiet Luxury",
      heroButtonText: "New Arrivals",
      heroButtonLink: "/new-arrivals",
      newsletterHeading: "Stay in the Conversation",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: { id: "site" },
  });

  const defaultNav = [
    { label: "Men", path: "/men", location: "HEADER", sortOrder: 1 },
    { label: "Women", path: "/women", location: "HEADER", sortOrder: 2 },
    { label: "Accessories", path: "/accessories", location: "HEADER", sortOrder: 3 },
    { label: "New Arrivals", path: "/new-arrivals", location: "HEADER", sortOrder: 4 },
    { label: "Men", path: "/men", location: "FOOTER_CATALOG", sortOrder: 1 },
    { label: "Women", path: "/women", location: "FOOTER_CATALOG", sortOrder: 2 },
    { label: "Accessories", path: "/accessories", location: "FOOTER_CATALOG", sortOrder: 3 },
    { label: "New Arrivals", path: "/new-arrivals", location: "FOOTER_CATALOG", sortOrder: 4 },
    { label: "About", path: "/about", location: "FOOTER_INFO", sortOrder: 1 },
    { label: "Contact", path: "/contact", location: "FOOTER_INFO", sortOrder: 2 },
    { label: "Delivery", path: "/delivery", location: "FOOTER_INFO", sortOrder: 3 },
    { label: "Returns", path: "/returns", location: "FOOTER_INFO", sortOrder: 4 },
    { label: "FAQ", path: "/faq", location: "FOOTER_INFO", sortOrder: 5 },
  ];

  for (const item of defaultNav) {
    await prisma.navigationItem.upsert({
      where: { id: `${item.location}-${item.sortOrder}` },
      update: {},
      create: { ...item, id: `${item.location}-${item.sortOrder}` },
    }).catch(async () => {
      await prisma.navigationItem.create({ data: item });
    });
  }

  const products = [
    {
      name: "Silk Charmeuse Midi Dress",
      slug: "silk-charmeuse-midi-dress",
      description: "An effortlessly graceful midi dress in liquid silk charmeuse. Cut on the bias to follow the natural movement of the body, it drapes beautifully with every step.",
      price: 485000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80", "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80"]),
      categoryId: categories.get("ready-to-wear")?.id,
      divisionId: women.id,
      fabric: "100% Silk Charmeuse",
      careInstructions: "Dry clean only.",
      fitNotes: "True to size. Model is 5'9\" wearing size S.",
      status: "ACTIVE",
      featured: true,
      isNewArrival: true,
      variants: [
        { size: "XS", color: "Ivory", colorHex: "#F5F0E8", stock: 2 },
        { size: "S", color: "Ivory", colorHex: "#F5F0E8", stock: 4 },
        { size: "M", color: "Ivory", colorHex: "#F5F0E8", stock: 3 },
        { size: "XS", color: "Blush", colorHex: "#E8C4B0", stock: 2 },
        { size: "S", color: "Blush", colorHex: "#E8C4B0", stock: 3 },
      ],
    },
    {
      name: "Linen Open-Back Blouse",
      slug: "linen-open-back-blouse",
      description: "A sculptural blouse crafted in washed Belgian linen. The open-back detail and relaxed silhouette create a tension between structure and ease.",
      price: 185000,
      compareAtPrice: 220000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1562137369-1a1a0bc66744?w=800&q=80"]),
      categoryId: categories.get("tops")?.id,
      divisionId: women.id,
      fabric: "100% Belgian Linen, enzyme washed",
      careInstructions: "Machine wash cold, gentle cycle.",
      fitNotes: "Relaxed fit. Size down for a more structured look.",
      status: "ACTIVE",
      featured: true,
      isNewArrival: true,
      variants: [
        { size: "S", color: "Sand", colorHex: "#D4B896", stock: 2 },
        { size: "M", color: "Sand", colorHex: "#D4B896", stock: 1 },
        { size: "S", color: "White", colorHex: "#F9F6F0", stock: 3 },
        { size: "M", color: "White", colorHex: "#F9F6F0", stock: 2 },
      ],
    },
    {
      name: "Wide-Leg Tailored Trousers",
      slug: "wide-leg-tailored-trousers",
      description: "Elevated wide-leg trousers in Italian wool-blend crepe. The high rise and clean lines create an elongated silhouette.",
      price: 295000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80"]),
      categoryId: categories.get("bottoms")?.id,
      divisionId: men.id,
      fabric: "72% Wool, 28% Silk — Italian Crepe",
      careInstructions: "Dry clean recommended.",
      fitNotes: "High rise, true to size.",
      status: "ACTIVE",
      featured: true,
      isNewArrival: false,
      variants: [
        { size: "XS", color: "Charcoal", colorHex: "#3D342E", stock: 3 },
        { size: "S", color: "Charcoal", colorHex: "#3D342E", stock: 5 },
        { size: "M", color: "Charcoal", colorHex: "#3D342E", stock: 4 },
        { size: "L", color: "Charcoal", colorHex: "#3D342E", stock: 2 },
      ],
    },
    {
      name: "Oversized Wool Coat",
      slug: "oversized-wool-coat",
      description: "A statement outerwear piece in double-faced cashmere-wool. The oversized silhouette and clean seaming define its understated authority.",
      price: 895000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800&q=80"]),
      categoryId: categories.get("outerwear")?.id,
      divisionId: men.id,
      fabric: "60% Cashmere, 40% Merino Wool",
      careInstructions: "Dry clean only.",
      fitNotes: "Intentionally oversized. Size down for a standard oversized fit.",
      status: "ACTIVE",
      featured: false,
      isNewArrival: false,
      variants: [
        { size: "S", color: "Camel", colorHex: "#C4956A", stock: 2 },
        { size: "M", color: "Camel", colorHex: "#C4956A", stock: 2 },
        { size: "S", color: "Black", colorHex: "#1A1A1A", stock: 3 },
        { size: "M", color: "Black", colorHex: "#1A1A1A", stock: 3 },
      ],
    },
    {
      name: "Draped Jersey Maxi Dress",
      slug: "draped-jersey-maxi-dress",
      description: "A fluid maxi dress in matte viscose jersey. The gathered one-shoulder neckline and twisted waist create elegant dimension.",
      price: 365000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80"]),
      categoryId: categories.get("ready-to-wear")?.id,
      divisionId: women.id,
      fabric: "100% Viscose Jersey",
      careInstructions: "Machine wash cold. Do not tumble dry.",
      fitNotes: "Fitted through bust, falls loose from waist. True to size.",
      status: "ACTIVE",
      featured: true,
      isNewArrival: true,
      variants: [
        { size: "XS", color: "Noir", colorHex: "#1A1A1A", stock: 4 },
        { size: "S", color: "Noir", colorHex: "#1A1A1A", stock: 5 },
        { size: "M", color: "Noir", colorHex: "#1A1A1A", stock: 4 },
        { size: "L", color: "Noir", colorHex: "#1A1A1A", stock: 2 },
      ],
    },
  ];

  for (const { variants, ...data } of products) {
    const product = await prisma.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        compareAtPrice: (data as { compareAtPrice?: number }).compareAtPrice ?? null,
        variants: {
          create: variants.map((v) => ({
            ...v,
            sku: `${data.slug}-${v.size}-${v.color}`.toLowerCase().replace(/\s+/g, "-"),
          })),
        },
      },
    });
    console.log(`  ✓ ${product.name}`);
  }

  const featuredProducts = await prisma.product.findMany({
    where: { featured: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const section = await prisma.homePageSection.upsert({
    where: { key: "available-now" },
    update: { title: "Available Now", label: "The Edit", visible: true, sortOrder: 1 },
    create: {
      key: "available-now",
      title: "Available Now",
      label: "The Edit",
      ctaLabel: "View New Arrivals",
      ctaLink: "/new-arrivals",
      visible: true,
      sortOrder: 1,
    },
  });

  await prisma.homeSectionProduct.deleteMany({ where: { sectionId: section.id } });
  for (const [index, product] of featuredProducts.entries()) {
    await prisma.homeSectionProduct.create({
      data: { sectionId: section.id, productId: product.id, sortOrder: index + 1 },
    });
  }

  console.log("\nDone.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
