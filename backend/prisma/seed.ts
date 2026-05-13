import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Admin ────────────────────────────────────────────────────────────────
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
  console.log(`  ✓ Admin: ${admin.email}`);

  // ── Divisions ────────────────────────────────────────────────────────────
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

  const men        = divisions.find((d) => d.key === "men")!;
  const women      = divisions.find((d) => d.key === "women")!;
  const accessories = divisions.find((d) => d.key === "accessories")!;

  // ── Categories ───────────────────────────────────────────────────────────
  const categoriesToSeed = [
    { name: "Ready to Wear",  slug: "ready-to-wear",  divisionId: men.id,        sortOrder: 1,  description: "Core garments for daily rotation." },
    { name: "Outerwear",      slug: "outerwear",       divisionId: men.id,        sortOrder: 2,  description: "Refined layers for cooler days." },
    { name: "Shirts",         slug: "shirts",          divisionId: men.id,        sortOrder: 3,  description: "Precise cuts in premium fabrics." },
    { name: "Trousers",       slug: "trousers",        divisionId: men.id,        sortOrder: 4,  description: "Tailored shapes from relaxed to structured." },
    { name: "Tops",           slug: "tops",            divisionId: women.id,      sortOrder: 5,  description: "Layering pieces and stand-alone forms." },
    { name: "Dresses",        slug: "dresses",         divisionId: women.id,      sortOrder: 6,  description: "From daywear to evening silhouettes." },
    { name: "Bottoms",        slug: "bottoms",         divisionId: women.id,      sortOrder: 7,  description: "From precise cuts to fluid drape." },
    { name: "Knitwear",       slug: "knitwear",        divisionId: women.id,      sortOrder: 8,  description: "Soft volume and subtle texture." },
    { name: "Shoes",          slug: "shoes",           divisionId: women.id,      sortOrder: 9,  description: "Essential pairs for day and evening." },
    { name: "Bags",           slug: "bags",            divisionId: accessories.id, sortOrder: 10, description: "Functional silhouettes with premium finish." },
    { name: "Jewellery",      slug: "jewellery",       divisionId: accessories.id, sortOrder: 11, description: "Minimal pieces with character." },
    { name: "Small Goods",    slug: "small-goods",     divisionId: accessories.id, sortOrder: 12, description: "Belts, wallets, and other accessories." },
  ];

  const catMap = new Map<string, string>();
  for (const c of categoriesToSeed) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, divisionId: c.divisionId, sortOrder: c.sortOrder, description: c.description },
      create: c,
    });
    catMap.set(c.slug, cat.id);
  }
  console.log(`  ✓ ${categoriesToSeed.length} categories`);

  // ── Homepage & Settings ──────────────────────────────────────────────────
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
    create: {
      id: "site",
      defaultDeliveryInfo: "Orders are processed within 1–2 business days. Delivery within Lebanon takes 2–4 business days.",
      defaultShippingInfo: "Free delivery on orders above 500,000 L.L. Standard delivery fee is 30,000 L.L.",
      defaultReturnsInfo: "We accept returns within 14 days of delivery. Items must be unworn, unwashed, and in original packaging.",
    },
  });

  // ── Navigation ───────────────────────────────────────────────────────────
  const defaultNav = [
    { label: "Men",          path: "/men",          location: "HEADER",       sortOrder: 1 },
    { label: "Women",        path: "/women",        location: "HEADER",       sortOrder: 2 },
    { label: "Accessories",  path: "/accessories",  location: "HEADER",       sortOrder: 3 },
    { label: "New Arrivals", path: "/new-arrivals", location: "HEADER",       sortOrder: 4 },
    { label: "Men",          path: "/men",          location: "FOOTER_CATALOG", sortOrder: 1 },
    { label: "Women",        path: "/women",        location: "FOOTER_CATALOG", sortOrder: 2 },
    { label: "Accessories",  path: "/accessories",  location: "FOOTER_CATALOG", sortOrder: 3 },
    { label: "New Arrivals", path: "/new-arrivals", location: "FOOTER_CATALOG", sortOrder: 4 },
    { label: "About",        path: "/about",        location: "FOOTER_INFO",  sortOrder: 1 },
    { label: "Contact",      path: "/contact",      location: "FOOTER_INFO",  sortOrder: 2 },
    { label: "Shipping",     path: "/shipping",     location: "FOOTER_INFO",  sortOrder: 3 },
    { label: "Returns",      path: "/returns",      location: "FOOTER_INFO",  sortOrder: 4 },
    { label: "FAQ",          path: "/faq",          location: "FOOTER_INFO",  sortOrder: 5 },
  ];
  for (const item of defaultNav) {
    const id = `${item.location}-${item.sortOrder}`;
    await prisma.navigationItem.upsert({
      where: { id },
      update: {},
      create: { ...item, id },
    }).catch(async () => { await prisma.navigationItem.create({ data: item }); });
  }

  // ── Products ─────────────────────────────────────────────────────────────
  type ProductSeed = {
    name: string; slug: string; description: string;
    price: number; compareAtPrice?: number;
    images: string; categorySlug: string; divisionId: string;
    fabric?: string; careInstructions?: string; fitNotes?: string;
    status: string; featured: boolean; isNewArrival: boolean; sortOrder: number;
    variants: { size?: string | null; color?: string | null; colorHex?: string | null; stock: number }[];
  };

  const products: ProductSeed[] = [
    // ── WOMEN — Dresses ────────────────────────────────────────────────────
    {
      name: "Silk Charmeuse Midi Dress",
      slug: "silk-charmeuse-midi-dress",
      description: "An effortlessly graceful midi dress in liquid silk charmeuse. Cut on the bias to follow the natural movement of the body, it drapes beautifully with every step.",
      price: 485000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80", "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80"]),
      categorySlug: "dresses", divisionId: women.id,
      fabric: "100% Silk Charmeuse", careInstructions: "Dry clean only.", fitNotes: "True to size. Model is 5'9\" wearing size S.",
      status: "ACTIVE", featured: true, isNewArrival: true, sortOrder: 1,
      variants: [
        { size: "XS", color: "Ivory",  colorHex: "#F5F0E8", stock: 2 },
        { size: "S",  color: "Ivory",  colorHex: "#F5F0E8", stock: 4 },
        { size: "M",  color: "Ivory",  colorHex: "#F5F0E8", stock: 3 },
        { size: "XS", color: "Blush",  colorHex: "#E8C4B0", stock: 2 },
        { size: "S",  color: "Blush",  colorHex: "#E8C4B0", stock: 3 },
        { size: "M",  color: "Blush",  colorHex: "#E8C4B0", stock: 1 },
      ],
    },
    {
      name: "Draped Jersey Maxi Dress",
      slug: "draped-jersey-maxi-dress",
      description: "A fluid maxi dress in matte viscose jersey. The gathered one-shoulder neckline and twisted waist create elegant dimension.",
      price: 365000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80", "https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=800&q=80"]),
      categorySlug: "dresses", divisionId: women.id,
      fabric: "100% Viscose Jersey", careInstructions: "Machine wash cold. Do not tumble dry.", fitNotes: "Fitted through bust, falls loose from waist. True to size.",
      status: "ACTIVE", featured: true, isNewArrival: true, sortOrder: 2,
      variants: [
        { size: "XS", color: "Noir",   colorHex: "#1A1A1A", stock: 4 },
        { size: "S",  color: "Noir",   colorHex: "#1A1A1A", stock: 5 },
        { size: "M",  color: "Noir",   colorHex: "#1A1A1A", stock: 4 },
        { size: "L",  color: "Noir",   colorHex: "#1A1A1A", stock: 2 },
        { size: "S",  color: "Ivory",  colorHex: "#F5F0E8", stock: 3 },
        { size: "M",  color: "Ivory",  colorHex: "#F5F0E8", stock: 2 },
      ],
    },
    {
      name: "Linen Wrap Dress",
      slug: "linen-wrap-dress",
      description: "A relaxed wrap dress in washed French linen. The self-tie waist and V-neckline give this piece effortless versatility from morning to evening.",
      price: 275000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1623609163859-ca93c959b98a?w=800&q=80"]),
      categorySlug: "dresses", divisionId: women.id,
      fabric: "100% French Linen, garment washed", careInstructions: "Machine wash cold, gentle cycle.", fitNotes: "Relaxed fit. True to size.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 3,
      variants: [
        { size: "S",  color: "Sand",   colorHex: "#D4B896", stock: 3 },
        { size: "M",  color: "Sand",   colorHex: "#D4B896", stock: 4 },
        { size: "L",  color: "Sand",   colorHex: "#D4B896", stock: 2 },
        { size: "S",  color: "Terracotta", colorHex: "#C17A5A", stock: 2 },
        { size: "M",  color: "Terracotta", colorHex: "#C17A5A", stock: 3 },
      ],
    },
    {
      name: "Structured Blazer Dress",
      slug: "structured-blazer-dress",
      description: "A double-breasted blazer dress in Italian wool-blend. The sharp lapels and cinched waist define a silhouette that moves between boardroom and evening.",
      price: 520000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1550614000-4895a10e1bfd?w=800&q=80"]),
      categorySlug: "dresses", divisionId: women.id,
      fabric: "68% Wool, 32% Polyester — Italian Blend", careInstructions: "Dry clean only.", fitNotes: "True to size. Size up if between sizes.",
      status: "ACTIVE", featured: true, isNewArrival: false, sortOrder: 4,
      variants: [
        { size: "XS", color: "Charcoal", colorHex: "#3D342E", stock: 2 },
        { size: "S",  color: "Charcoal", colorHex: "#3D342E", stock: 3 },
        { size: "M",  color: "Charcoal", colorHex: "#3D342E", stock: 3 },
        { size: "L",  color: "Charcoal", colorHex: "#3D342E", stock: 1 },
        { size: "S",  color: "Camel",    colorHex: "#C4956A", stock: 2 },
        { size: "M",  color: "Camel",    colorHex: "#C4956A", stock: 2 },
      ],
    },

    // ── WOMEN — Tops ───────────────────────────────────────────────────────
    {
      name: "Linen Open-Back Blouse",
      slug: "linen-open-back-blouse",
      description: "A sculptural blouse crafted in washed Belgian linen. The open-back detail and relaxed silhouette create a tension between structure and ease.",
      price: 185000,
      compareAtPrice: 220000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1562137369-1a1a0bc66744?w=800&q=80"]),
      categorySlug: "tops", divisionId: women.id,
      fabric: "100% Belgian Linen, enzyme washed", careInstructions: "Machine wash cold, gentle cycle.", fitNotes: "Relaxed fit. Size down for a more structured look.",
      status: "ACTIVE", featured: true, isNewArrival: true, sortOrder: 5,
      variants: [
        { size: "S", color: "Sand",  colorHex: "#D4B896", stock: 2 },
        { size: "M", color: "Sand",  colorHex: "#D4B896", stock: 1 },
        { size: "S", color: "White", colorHex: "#F9F6F0", stock: 3 },
        { size: "M", color: "White", colorHex: "#F9F6F0", stock: 2 },
      ],
    },
    {
      name: "Silk Satin Camisole",
      slug: "silk-satin-camisole",
      description: "A languid camisole in pure silk satin. The adjustable spaghetti straps and bias-cut hem make it as elegant layered under a blazer as it is worn alone.",
      price: 165000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1594938298603-c8148c4b4a3c?w=800&q=80"]),
      categorySlug: "tops", divisionId: women.id,
      fabric: "100% Mulberry Silk Satin", careInstructions: "Hand wash cold or dry clean.", fitNotes: "True to size. For a looser fit, size up.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 6,
      variants: [
        { size: "XS", color: "Champagne", colorHex: "#E8D5AA", stock: 3 },
        { size: "S",  color: "Champagne", colorHex: "#E8D5AA", stock: 4 },
        { size: "M",  color: "Champagne", colorHex: "#E8D5AA", stock: 3 },
        { size: "XS", color: "Noir",      colorHex: "#1A1A1A", stock: 3 },
        { size: "S",  color: "Noir",      colorHex: "#1A1A1A", stock: 4 },
        { size: "M",  color: "Noir",      colorHex: "#1A1A1A", stock: 2 },
      ],
    },
    {
      name: "Cropped Poplin Shirt",
      slug: "cropped-poplin-shirt",
      description: "A precise cropped shirt in 100-count Egyptian cotton poplin. The boxy cut and raw-edged hem give classic suiting fabric a relaxed edit.",
      price: 145000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80"]),
      categorySlug: "tops", divisionId: women.id,
      fabric: "100% Egyptian Cotton Poplin", careInstructions: "Machine wash warm, tumble dry low.", fitNotes: "Boxy fit. True to size.",
      status: "ACTIVE", featured: false, isNewArrival: false, sortOrder: 7,
      variants: [
        { size: "XS", color: "White",    colorHex: "#F9F6F0", stock: 5 },
        { size: "S",  color: "White",    colorHex: "#F9F6F0", stock: 5 },
        { size: "M",  color: "White",    colorHex: "#F9F6F0", stock: 4 },
        { size: "S",  color: "Sky Blue", colorHex: "#9DB5C8", stock: 3 },
        { size: "M",  color: "Sky Blue", colorHex: "#9DB5C8", stock: 3 },
      ],
    },

    // ── WOMEN — Bottoms ────────────────────────────────────────────────────
    {
      name: "Wide-Leg Tailored Trousers",
      slug: "wide-leg-tailored-trousers",
      description: "Elevated wide-leg trousers in Italian wool-blend crepe. The high rise and clean lines create an elongated silhouette.",
      price: 295000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80"]),
      categorySlug: "bottoms", divisionId: women.id,
      fabric: "72% Wool, 28% Silk — Italian Crepe", careInstructions: "Dry clean recommended.", fitNotes: "High rise, true to size.",
      status: "ACTIVE", featured: true, isNewArrival: false, sortOrder: 8,
      variants: [
        { size: "XS", color: "Charcoal", colorHex: "#3D342E", stock: 3 },
        { size: "S",  color: "Charcoal", colorHex: "#3D342E", stock: 5 },
        { size: "M",  color: "Charcoal", colorHex: "#3D342E", stock: 4 },
        { size: "L",  color: "Charcoal", colorHex: "#3D342E", stock: 2 },
        { size: "S",  color: "Ivory",    colorHex: "#F5F0E8", stock: 3 },
        { size: "M",  color: "Ivory",    colorHex: "#F5F0E8", stock: 2 },
      ],
    },
    {
      name: "Bias-Cut Satin Midi Skirt",
      slug: "bias-cut-satin-midi-skirt",
      description: "A slip-like midi skirt in recycled satin, cut on the bias for a fluid fall. The elasticated waist and subtle sheen make it an instant wardrobe staple.",
      price: 215000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1583496661160-fb5218afa9a4?w=800&q=80"]),
      categorySlug: "bottoms", divisionId: women.id,
      fabric: "100% Recycled Polyester Satin", careInstructions: "Machine wash cold, gentle cycle.", fitNotes: "True to size. Elasticated waist.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 9,
      variants: [
        { size: "XS", color: "Champagne", colorHex: "#E8D5AA", stock: 4 },
        { size: "S",  color: "Champagne", colorHex: "#E8D5AA", stock: 5 },
        { size: "M",  color: "Champagne", colorHex: "#E8D5AA", stock: 3 },
        { size: "XS", color: "Midnight",  colorHex: "#1C1C2E", stock: 3 },
        { size: "S",  color: "Midnight",  colorHex: "#1C1C2E", stock: 4 },
        { size: "M",  color: "Midnight",  colorHex: "#1C1C2E", stock: 2 },
      ],
    },

    // ── WOMEN — Knitwear ───────────────────────────────────────────────────
    {
      name: "Fine-Gauge Cashmere Sweater",
      slug: "fine-gauge-cashmere-sweater",
      description: "A refined crewneck in 2-ply grade-A Mongolian cashmere. The fine gauge and relaxed drape make this the foundation of the cold-season wardrobe.",
      price: 420000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80"]),
      categorySlug: "knitwear", divisionId: women.id,
      fabric: "100% Grade-A Mongolian Cashmere, 2-ply", careInstructions: "Hand wash cold or dry clean. Lay flat to dry.", fitNotes: "Relaxed fit. True to size.",
      status: "ACTIVE", featured: true, isNewArrival: false, sortOrder: 10,
      variants: [
        { size: "XS", color: "Ecru",    colorHex: "#EDE0CB", stock: 3 },
        { size: "S",  color: "Ecru",    colorHex: "#EDE0CB", stock: 4 },
        { size: "M",  color: "Ecru",    colorHex: "#EDE0CB", stock: 3 },
        { size: "XS", color: "Camel",   colorHex: "#C4956A", stock: 2 },
        { size: "S",  color: "Camel",   colorHex: "#C4956A", stock: 3 },
        { size: "M",  color: "Camel",   colorHex: "#C4956A", stock: 2 },
        { size: "XS", color: "Noir",    colorHex: "#1A1A1A", stock: 3 },
        { size: "S",  color: "Noir",    colorHex: "#1A1A1A", stock: 4 },
        { size: "M",  color: "Noir",    colorHex: "#1A1A1A", stock: 3 },
      ],
    },
    {
      name: "Oversized Ribbed Cardigan",
      slug: "oversized-ribbed-cardigan",
      description: "A generously cut open-front cardigan in dense rib-knit merino wool. The dropped shoulders and deep pockets make this the most lived-in layer of the season.",
      price: 310000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80"]),
      categorySlug: "knitwear", divisionId: women.id,
      fabric: "80% Merino Wool, 20% Nylon", careInstructions: "Hand wash cold. Lay flat to dry.", fitNotes: "Intentionally oversized. Size down for a closer fit.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 11,
      variants: [
        { size: "S",  color: "Oatmeal", colorHex: "#D9CDB8", stock: 3 },
        { size: "M",  color: "Oatmeal", colorHex: "#D9CDB8", stock: 4 },
        { size: "L",  color: "Oatmeal", colorHex: "#D9CDB8", stock: 3 },
        { size: "S",  color: "Noir",    colorHex: "#1A1A1A", stock: 2 },
        { size: "M",  color: "Noir",    colorHex: "#1A1A1A", stock: 3 },
      ],
    },

    // ── WOMEN — Shoes ──────────────────────────────────────────────────────
    {
      name: "Square-Toe Leather Mule",
      slug: "square-toe-leather-mule",
      description: "A refined slip-on mule in full-grain Italian leather. The square toe and low block heel make this the most wearable elevated shoe in the edit.",
      price: 385000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80"]),
      categorySlug: "shoes", divisionId: women.id,
      fabric: "Upper: 100% Full-Grain Italian Leather. Sole: Leather and rubber.",
      careInstructions: "Clean with leather conditioner. Store in dust bag.",
      fitNotes: "True to size. Half size down if between sizes.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 12,
      variants: [
        { size: "36", color: "Nude",  colorHex: "#C4956A", stock: 2 },
        { size: "37", color: "Nude",  colorHex: "#C4956A", stock: 3 },
        { size: "38", color: "Nude",  colorHex: "#C4956A", stock: 3 },
        { size: "39", color: "Nude",  colorHex: "#C4956A", stock: 2 },
        { size: "37", color: "Black", colorHex: "#1A1A1A", stock: 2 },
        { size: "38", color: "Black", colorHex: "#1A1A1A", stock: 3 },
        { size: "39", color: "Black", colorHex: "#1A1A1A", stock: 2 },
      ],
    },
    {
      name: "Strappy Heeled Sandal",
      slug: "strappy-heeled-sandal",
      description: "A delicate heeled sandal in supple nappa leather. The thin crossed straps and slender heel balance exposure with refinement.",
      price: 445000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1515347619252-60a4bf4fff4f?w=800&q=80"]),
      categorySlug: "shoes", divisionId: women.id,
      fabric: "Upper: Nappa Leather. Insole: Leather. Heel height: 8cm.",
      careInstructions: "Wipe clean with soft damp cloth. Store in dust bag.",
      fitNotes: "True to size.",
      status: "ACTIVE", featured: false, isNewArrival: false, sortOrder: 13,
      variants: [
        { size: "36", color: "Gold",  colorHex: "#C4A265", stock: 2 },
        { size: "37", color: "Gold",  colorHex: "#C4A265", stock: 3 },
        { size: "38", color: "Gold",  colorHex: "#C4A265", stock: 3 },
        { size: "39", color: "Gold",  colorHex: "#C4A265", stock: 2 },
        { size: "37", color: "Nude",  colorHex: "#C4956A", stock: 3 },
        { size: "38", color: "Nude",  colorHex: "#C4956A", stock: 3 },
      ],
    },

    // ── MEN — Shirts ───────────────────────────────────────────────────────
    {
      name: "Oxford Weave Dress Shirt",
      slug: "oxford-weave-dress-shirt",
      description: "A sharp dress shirt in 120-count two-ply Oxford cotton. The spread collar and precise single-needle stitching give this piece its clean authority.",
      price: 195000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80"]),
      categorySlug: "shirts", divisionId: men.id,
      fabric: "100% Two-Ply Egyptian Cotton, Oxford Weave", careInstructions: "Machine wash warm. Iron on medium heat.", fitNotes: "Slim fit. Size up for a relaxed cut.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 14,
      variants: [
        { size: "S",  color: "White", colorHex: "#F9F6F0", stock: 5 },
        { size: "M",  color: "White", colorHex: "#F9F6F0", stock: 6 },
        { size: "L",  color: "White", colorHex: "#F9F6F0", stock: 5 },
        { size: "XL", color: "White", colorHex: "#F9F6F0", stock: 3 },
        { size: "S",  color: "Pale Blue", colorHex: "#A8C0D0", stock: 3 },
        { size: "M",  color: "Pale Blue", colorHex: "#A8C0D0", stock: 4 },
        { size: "L",  color: "Pale Blue", colorHex: "#A8C0D0", stock: 3 },
      ],
    },
    {
      name: "Washed Linen Shirt",
      slug: "washed-linen-shirt",
      description: "An easy-wearing linen shirt in a lived-in washed finish. The relaxed collar and slightly boxy cut make this equally at home on weekends and in the office.",
      price: 165000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1589902860314-e910697dea18?w=800&q=80"]),
      categorySlug: "shirts", divisionId: men.id,
      fabric: "100% Enzyme-Washed European Linen", careInstructions: "Machine wash cold. Tumble dry low.", fitNotes: "Relaxed fit. True to size.",
      status: "ACTIVE", featured: false, isNewArrival: false, sortOrder: 15,
      variants: [
        { size: "S",  color: "Sand",  colorHex: "#D4B896", stock: 4 },
        { size: "M",  color: "Sand",  colorHex: "#D4B896", stock: 5 },
        { size: "L",  color: "Sand",  colorHex: "#D4B896", stock: 4 },
        { size: "XL", color: "Sand",  colorHex: "#D4B896", stock: 2 },
        { size: "S",  color: "White", colorHex: "#F9F6F0", stock: 3 },
        { size: "M",  color: "White", colorHex: "#F9F6F0", stock: 4 },
        { size: "L",  color: "White", colorHex: "#F9F6F0", stock: 3 },
      ],
    },

    // ── MEN — Trousers ─────────────────────────────────────────────────────
    {
      name: "Tapered Wool Trousers",
      slug: "tapered-wool-trousers",
      description: "Clean-cut tapered trousers in Super 100s Italian wool. The mid-rise and tapered leg work as well with a blazer as with a simple T-shirt.",
      price: 315000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80"]),
      categorySlug: "trousers", divisionId: men.id,
      fabric: "Super 100s Italian Wool", careInstructions: "Dry clean recommended.", fitNotes: "Mid rise, tapered leg. True to size.",
      status: "ACTIVE", featured: true, isNewArrival: false, sortOrder: 16,
      variants: [
        { size: "S",  color: "Navy",     colorHex: "#1B2A4A", stock: 3 },
        { size: "M",  color: "Navy",     colorHex: "#1B2A4A", stock: 4 },
        { size: "L",  color: "Navy",     colorHex: "#1B2A4A", stock: 3 },
        { size: "XL", color: "Navy",     colorHex: "#1B2A4A", stock: 2 },
        { size: "S",  color: "Charcoal", colorHex: "#3D342E", stock: 3 },
        { size: "M",  color: "Charcoal", colorHex: "#3D342E", stock: 4 },
        { size: "L",  color: "Charcoal", colorHex: "#3D342E", stock: 3 },
      ],
    },
    {
      name: "Relaxed Linen Trousers",
      slug: "relaxed-linen-trousers",
      description: "Drawstring-waist trousers in stonewashed Italian linen. The wide leg and lightweight fabric move with the wearer, ideal for warm-weather dressing.",
      price: 225000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1594938374182-a57c3c59e708?w=800&q=80"]),
      categorySlug: "trousers", divisionId: men.id,
      fabric: "100% Stonewashed Italian Linen", careInstructions: "Machine wash cold.", fitNotes: "Wide leg. True to size.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 17,
      variants: [
        { size: "S",  color: "Ecru",  colorHex: "#EDE0CB", stock: 4 },
        { size: "M",  color: "Ecru",  colorHex: "#EDE0CB", stock: 5 },
        { size: "L",  color: "Ecru",  colorHex: "#EDE0CB", stock: 4 },
        { size: "XL", color: "Ecru",  colorHex: "#EDE0CB", stock: 2 },
        { size: "S",  color: "Olive", colorHex: "#6B6B3A", stock: 3 },
        { size: "M",  color: "Olive", colorHex: "#6B6B3A", stock: 3 },
      ],
    },

    // ── MEN — Outerwear ────────────────────────────────────────────────────
    {
      name: "Oversized Wool Coat",
      slug: "oversized-wool-coat",
      description: "A statement outerwear piece in double-faced cashmere-wool. The oversized silhouette and clean seaming define its understated authority.",
      price: 895000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800&q=80"]),
      categorySlug: "outerwear", divisionId: men.id,
      fabric: "60% Cashmere, 40% Merino Wool", careInstructions: "Dry clean only.", fitNotes: "Intentionally oversized. Size down for a standard oversized fit.",
      status: "ACTIVE", featured: true, isNewArrival: false, sortOrder: 18,
      variants: [
        { size: "S", color: "Camel", colorHex: "#C4956A", stock: 2 },
        { size: "M", color: "Camel", colorHex: "#C4956A", stock: 2 },
        { size: "S", color: "Black", colorHex: "#1A1A1A", stock: 3 },
        { size: "M", color: "Black", colorHex: "#1A1A1A", stock: 3 },
      ],
    },
    {
      name: "Unstructured Linen Blazer",
      slug: "unstructured-linen-blazer",
      description: "A deconstructed single-button blazer in Belgian linen. The unstructured shoulder and patch pockets give suiting fabric a relaxed summer register.",
      price: 445000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80"]),
      categorySlug: "outerwear", divisionId: men.id,
      fabric: "100% Belgian Linen", careInstructions: "Dry clean or hand wash cold.", fitNotes: "Relaxed fit. True to size.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 19,
      variants: [
        { size: "S",  color: "Sand",  colorHex: "#D4B896", stock: 3 },
        { size: "M",  color: "Sand",  colorHex: "#D4B896", stock: 4 },
        { size: "L",  color: "Sand",  colorHex: "#D4B896", stock: 3 },
        { size: "XL", color: "Sand",  colorHex: "#D4B896", stock: 1 },
        { size: "S",  color: "Navy",  colorHex: "#1B2A4A", stock: 2 },
        { size: "M",  color: "Navy",  colorHex: "#1B2A4A", stock: 3 },
      ],
    },

    // ── ACCESSORIES — Bags ─────────────────────────────────────────────────
    {
      name: "Mini Structured Tote",
      slug: "mini-structured-tote",
      description: "A compact structured tote in pebbled full-grain leather. The rigid base and clean top handles give this bag its quietly authoritative shape.",
      price: 680000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"]),
      categorySlug: "bags", divisionId: accessories.id,
      fabric: "Exterior: Pebbled Full-Grain Leather. Lining: Suede.",
      careInstructions: "Wipe with soft cloth. Avoid prolonged exposure to sunlight. Store in dust bag.",
      fitNotes: "Dimensions: 25 × 20 × 10 cm. Fits a compact daily essentials.",
      status: "ACTIVE", featured: true, isNewArrival: true, sortOrder: 20,
      variants: [
        { color: "Black",  colorHex: "#1A1A1A", stock: 4, size: null },
        { color: "Tan",    colorHex: "#C4956A", stock: 3, size: null },
        { color: "Ivory",  colorHex: "#F5F0E8", stock: 2, size: null },
      ],
    },
    {
      name: "Soft Leather Crossbody",
      slug: "soft-leather-crossbody",
      description: "A slim crossbody in buttery Napa leather. The minimal hardware and chain strap make it an effortless companion from day to evening.",
      price: 520000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"]),
      categorySlug: "bags", divisionId: accessories.id,
      fabric: "Exterior: Napa Leather. Chain: Gold-plated brass.",
      careInstructions: "Wipe gently with dry cloth. Store stuffed in dust bag.",
      fitNotes: "Dimensions: 20 × 14 × 5 cm. Chain strap drop: 55 cm.",
      status: "ACTIVE", featured: true, isNewArrival: false, sortOrder: 21,
      variants: [
        { color: "Black",  colorHex: "#1A1A1A", stock: 5, size: null },
        { color: "Taupe",  colorHex: "#B8A090", stock: 4, size: null },
        { color: "Cognac", colorHex: "#9B5A2A", stock: 3, size: null },
      ],
    },
    {
      name: "Woven Straw Basket Bag",
      slug: "woven-straw-basket-bag",
      description: "A handwoven seagrass basket bag with leather top handles and an interior cotton lining. Artisan-crafted in Morocco.",
      price: 295000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80"]),
      categorySlug: "bags", divisionId: accessories.id,
      fabric: "Exterior: Natural Seagrass. Handles: Vegetable-Tanned Leather. Lining: Cotton.",
      careInstructions: "Spot clean only. Keep dry. Store in a cool, ventilated space.",
      fitNotes: "Dimensions: 30 × 22 × 15 cm.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 22,
      variants: [
        { color: "Natural", colorHex: "#D4B896", stock: 6, size: null },
        { color: "Black",   colorHex: "#1A1A1A", stock: 3, size: null },
      ],
    },

    // ── ACCESSORIES — Jewellery ────────────────────────────────────────────
    {
      name: "Hammered Gold Cuff",
      slug: "hammered-gold-cuff",
      description: "A wide cuff bracelet in 18k gold vermeil over sterling silver. The hand-hammered surface catches light softly, making it a piece worn alone or stacked.",
      price: 185000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80"]),
      categorySlug: "jewellery", divisionId: accessories.id,
      fabric: "18k Gold Vermeil over Sterling Silver (925).",
      careInstructions: "Polish with soft jewellery cloth. Avoid water and perfume.",
      fitNotes: "One size. Inner diameter: 5.8 cm. Adjustable.",
      status: "ACTIVE", featured: true, isNewArrival: true, sortOrder: 23,
      variants: [
        { color: "Gold",   colorHex: "#C4A265", stock: 8,  size: null },
        { color: "Silver", colorHex: "#C0C0C0", stock: 6,  size: null },
      ],
    },
    {
      name: "Thin Gold Chain Necklace",
      slug: "thin-gold-chain-necklace",
      description: "A delicate 18k gold vermeil chain necklace. The barely-there weight makes it ideal for layering, but equally refined worn alone.",
      price: 125000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"]),
      categorySlug: "jewellery", divisionId: accessories.id,
      fabric: "18k Gold Vermeil over Sterling Silver (925).",
      careInstructions: "Store in jewellery pouch when not worn. Avoid contact with water.",
      fitNotes: "Length: 45 cm with 5 cm extender.",
      status: "ACTIVE", featured: false, isNewArrival: false, sortOrder: 24,
      variants: [
        { color: "Gold",   colorHex: "#C4A265", stock: 12, size: null },
        { color: "Silver", colorHex: "#C0C0C0", stock: 10, size: null },
      ],
    },
    {
      name: "Sculptural Drop Earrings",
      slug: "sculptural-drop-earrings",
      description: "Abstract drop earrings cast in sterling silver. Each pair is slightly unique — the organic form comes from a hand-sculpted wax original.",
      price: 155000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&q=80"]),
      categorySlug: "jewellery", divisionId: accessories.id,
      fabric: "Recycled Sterling Silver (925). Butterfly back fastening.",
      careInstructions: "Store flat in jewellery box. Clean with silver polishing cloth.",
      fitNotes: "Drop length: 4 cm.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 25,
      variants: [
        { color: "Silver", colorHex: "#C0C0C0", stock: 8, size: null },
        { color: "Gold",   colorHex: "#C4A265", stock: 6, size: null },
      ],
    },

    // ── ACCESSORIES — Small Goods ──────────────────────────────────────────
    {
      name: "Woven Leather Belt",
      slug: "woven-leather-belt",
      description: "A hand-woven belt in vegetable-tanned Italian leather. The understated gold pin buckle completes an accessory that improves with age and wear.",
      price: 145000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80"]),
      categorySlug: "small-goods", divisionId: accessories.id,
      fabric: "Vegetable-Tanned Italian Leather. Buckle: Gold-plated zinc alloy.",
      careInstructions: "Condition with leather cream annually. Avoid prolonged water exposure.",
      fitNotes: "Available in 80cm, 90cm, 100cm.",
      status: "ACTIVE", featured: false, isNewArrival: false, sortOrder: 26,
      variants: [
        { size: "80cm",  color: "Tan",   colorHex: "#C4956A", stock: 4 },
        { size: "90cm",  color: "Tan",   colorHex: "#C4956A", stock: 5 },
        { size: "100cm", color: "Tan",   colorHex: "#C4956A", stock: 3 },
        { size: "80cm",  color: "Black", colorHex: "#1A1A1A", stock: 3 },
        { size: "90cm",  color: "Black", colorHex: "#1A1A1A", stock: 4 },
        { size: "100cm", color: "Black", colorHex: "#1A1A1A", stock: 3 },
      ],
    },
    {
      name: "Silk Twill Scarf",
      slug: "silk-twill-scarf",
      description: "A 90×90cm square scarf in heavyweight silk twill, printed with an abstract graphic. Can be worn as a headscarf, tied on a bag handle, or draped as a top.",
      price: 195000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80"]),
      categorySlug: "small-goods", divisionId: accessories.id,
      fabric: "100% Silk Twill, 12mm weight. Hand-rolled edges.",
      careInstructions: "Dry clean only.",
      fitNotes: "90 × 90 cm.",
      status: "ACTIVE", featured: false, isNewArrival: true, sortOrder: 27,
      variants: [
        { color: "Ivory / Gold",  colorHex: "#E8D5AA", stock: 5, size: null },
        { color: "Noir / Ivory",  colorHex: "#1A1A1A", stock: 5, size: null },
        { color: "Sand / Blush",  colorHex: "#D4B896", stock: 4, size: null },
      ],
    },
    {
      name: "Slim Card Wallet",
      slug: "slim-card-wallet",
      description: "A flat card wallet in smooth full-grain leather. Four card slots and a centre cash pocket keep essentials minimal without compromise.",
      price: 95000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80"]),
      categorySlug: "small-goods", divisionId: accessories.id,
      fabric: "Full-Grain Smooth Leather.",
      careInstructions: "Wipe clean. Avoid overfilling — this expands and softens with use.",
      fitNotes: "Dimensions: 10 × 7.5 × 0.6 cm. Holds 4–6 cards.",
      status: "ACTIVE", featured: false, isNewArrival: false, sortOrder: 28,
      variants: [
        { color: "Black",  colorHex: "#1A1A1A", stock: 8, size: null },
        { color: "Tan",    colorHex: "#C4956A", stock: 7, size: null },
        { color: "Cognac", colorHex: "#9B5A2A", stock: 5, size: null },
      ],
    },
  ];

  let created = 0;
  for (const { variants, categorySlug, ...data } of products) {
    const categoryId = catMap.get(categorySlug);
    const product = await prisma.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        categoryId: categoryId ?? null,
        compareAtPrice: (data as any).compareAtPrice ?? null,
        variants: {
          create: variants.map((v) => ({
            size: v.size ?? null,
            color: v.color ?? null,
            colorHex: v.colorHex ?? null,
            stock: v.stock,
            reserved: 0,
            sku: `${data.slug}-${(v.size ?? "os")}-${(v.color ?? "one")}`.toLowerCase().replace(/[\s\/]+/g, "-"),
          })),
        },
      },
    });
    created++;
    console.log(`  ✓ ${product.name}`);
  }
  console.log(`\n  ${created} products seeded.`);

  // ── Homepage section — link featured products ────────────────────────────
  const featuredProducts = await prisma.product.findMany({
    where: { featured: true },
    orderBy: { sortOrder: "asc" },
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
  for (const [i, p] of featuredProducts.entries()) {
    await prisma.homeSectionProduct.create({ data: { sectionId: section.id, productId: p.id, sortOrder: i + 1 } });
  }

  console.log(`\nDone — ${created} products, ${categoriesToSeed.length} categories.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
