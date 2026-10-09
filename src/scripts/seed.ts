import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { Role, ProductStatus } from "@prisma/client";

async function seed() {
  console.log("🌱 Starting Sopifest database seeding...");

  // 1. Clean existing records
  console.log("🧹 Cleaning existing collections...");
  await prisma.review.deleteMany();
  await prisma.order.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();

  // 2. Hash passwords
  const salt = await bcrypt.genSalt(12);
  const adminPasswordHash = await bcrypt.hash("Admin@123456", salt);
  const userPasswordHash = await bcrypt.hash("User@123456", salt);

  // 3. Create Users
  console.log("👤 Seeding admin and customer users...");
  const adminUser = await prisma.user.create({
    data: {
      name: "Sopifest Administrator",
      email: "admin@sopifest.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      phone: "+1 800-555-0199",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      name: "Sarah Jenkins",
      email: "user@sopifest.com",
      passwordHash: userPasswordHash,
      role: Role.USER,
      phone: "+1 555-234-5678",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
      addresses: [
        {
          id: "addr-001",
          fullName: "Sarah Jenkins",
          phone: "+1 555-234-5678",
          streetAddress: "742 Evergreen Terrace",
          city: "Springfield",
          state: "IL",
          postalCode: "62704",
          country: "United States",
          isDefault: true,
        },
      ],
    },
  });

  // 4. Create Categories
  console.log("📂 Seeding product categories...");
  const categoriesData = [
    {
      name: "Clothing & Apparel",
      slug: "clothing",
      description: "Modern, sustainable fashion and everyday wardrobe essentials.",
      image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80",
      featured: true,
    },
    {
      name: "Electronics & Gadgets",
      slug: "electronics",
      description: "Cutting-edge audio, smart home devices, and maker tech.",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
      featured: true,
    },
    {
      name: "Wooden Toys & Crafts",
      slug: "toys",
      description: "Eco-friendly wooden puzzles, montessori sets, and educational games.",
      image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
      featured: true,
    },
    {
      name: "Furniture & Living",
      slug: "furniture",
      description: "Ergonomic, modern, and handcrafted home furnishings.",
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
      featured: true,
    },
    {
      name: "Accessories & Everyday",
      slug: "misc",
      description: "Premium leather goods, desk accessories, and travel gear.",
      image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
      featured: false,
    },
  ];

  const createdCategories: Record<string, any> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    createdCategories[cat.slug] = created;
  }

  // 5. Create Products
  console.log("🛍️ Seeding 20+ multi-category products...");
  const productsData = [
    // --- Clothing ---
    {
      title: "Organic Cotton Heavyweight Hoodie",
      slug: "organic-cotton-heavyweight-hoodie",
      sku: "CLO-HD-001",
      brand: "EcoWear",
      description: "A premium 450 GSM French Terry organic cotton hoodie built for lifetime durability and supreme comfort.",
      shortDescription: "Ultra-heavyweight 450 GSM organic French Terry hoodie.",
      categoryId: createdCategories["clothing"].id,
      basePrice: 89.0,
      discountPrice: 79.0,
      hasVariants: true,
      images: [
        { url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80", alt: "Black Hoodie Front", isPrimary: true, order: 0 },
        { url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80", alt: "Black Hoodie Back", isPrimary: false, order: 1 },
      ],
      variants: [
        { id: "var-c1", sku: "CLO-HD-001-BLK-M", title: "Black / M", attributes: { color: "Black", size: "M" }, price: 79.0, stockCount: 25 },
        { id: "var-c2", sku: "CLO-HD-001-BLK-L", title: "Black / L", attributes: { color: "Black", size: "L" }, price: 79.0, stockCount: 30 },
        { id: "var-c3", sku: "CLO-HD-001-GRY-L", title: "Heather Grey / L", attributes: { color: "Heather Grey", size: "L" }, price: 79.0, stockCount: 15 },
      ],
      specifications: [{ key: "Material", value: "100% Organic Cotton" }, { key: "Weight", value: "450 GSM" }],
      stockCount: 70,
      lowStockThreshold: 10,
      rating: 4.8,
      numReviews: 24,
      isNewArrival: true,
      isTopSeller: true,
      featured: true,
    },
    {
      title: "Tailored Linen Casual Shirt",
      slug: "tailored-linen-casual-shirt",
      sku: "CLO-SH-002",
      brand: "Solstice",
      description: "Breathable European flax linen shirt featuring shell buttons and a relaxed modern fit.",
      shortDescription: "Pure European linen casual button-down shirt.",
      categoryId: createdCategories["clothing"].id,
      basePrice: 65.0,
      hasVariants: true,
      images: [
        { url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80", alt: "Linen Shirt", isPrimary: true, order: 0 },
      ],
      variants: [
        { id: "var-c4", sku: "CLO-SH-002-WHT-M", title: "White / M", attributes: { color: "White", size: "M" }, price: 65.0, stockCount: 18 },
        { id: "var-c5", sku: "CLO-SH-002-NVY-L", title: "Navy / L", attributes: { color: "Navy", size: "L" }, price: 65.0, stockCount: 12 },
      ],
      specifications: [{ key: "Material", value: "100% European Linen" }],
      stockCount: 30,
      rating: 4.6,
      numReviews: 12,
      isNewArrival: true,
      isTopSeller: false,
    },
    {
      title: "Raw Denim Selvedge Jeans",
      slug: "raw-denim-selvedge-jeans",
      sku: "CLO-JN-003",
      brand: "IndigoCraft",
      description: "14oz Japanese shuttle-loom selvedge denim tailored for a classic slim-straight silhouette.",
      shortDescription: "14oz Japanese red-line selvedge denim jeans.",
      categoryId: createdCategories["clothing"].id,
      basePrice: 135.0,
      discountPrice: 119.0,
      hasVariants: true,
      images: [
        { url: "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80", alt: "Selvedge Jeans", isPrimary: true, order: 0 },
      ],
      variants: [
        { id: "var-c6", sku: "CLO-JN-003-32", title: "Indigo / 32x32", attributes: { size: "32x32", color: "Indigo" }, price: 119.0, stockCount: 14 },
        { id: "var-c7", sku: "CLO-JN-003-34", title: "Indigo / 34x32", attributes: { size: "34x32", color: "Indigo" }, price: 119.0, stockCount: 10 },
      ],
      specifications: [{ key: "Denim Weight", value: "14 oz" }, { key: "Origin", value: "Okayama, Japan" }],
      stockCount: 24,
      rating: 4.9,
      numReviews: 45,
      isTopSeller: true,
    },
    {
      title: "Merino Wool Thermal Crewneck",
      slug: "merino-wool-thermal-crewneck",
      sku: "CLO-SW-004",
      brand: "NordicAlpine",
      description: "Ultra-fine 18.5 micron Merino wool sweater for natural thermoregulation and odor resistance.",
      shortDescription: "Ultra-fine Merino wool base layer and knit sweater.",
      categoryId: createdCategories["clothing"].id,
      basePrice: 110.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80", alt: "Merino Sweater", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Material", value: "100% Merino Wool" }],
      stockCount: 20,
      rating: 4.7,
      numReviews: 18,
      isNewArrival: false,
      isTopSeller: false,
    },

    // --- Electronics ---
    {
      title: "Wireless ANC Studio Headphones",
      slug: "wireless-anc-studio-headphones",
      sku: "ELE-HP-001",
      brand: "Acoustix",
      description: "Active Noise Cancelling over-ear headphones with 40mm custom beryllium drivers and 45h battery life.",
      shortDescription: "Hybrid ANC wireless headphones with studio-grade sound.",
      categoryId: createdCategories["electronics"].id,
      basePrice: 199.0,
      discountPrice: 169.0,
      hasVariants: true,
      images: [
        { url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80", alt: "Studio Headphones", isPrimary: true, order: 0 },
      ],
      variants: [
        { id: "var-e1", sku: "ELE-HP-001-BLK", title: "Matte Black", attributes: { color: "Matte Black" }, price: 169.0, stockCount: 30 },
        { id: "var-e2", sku: "ELE-HP-001-SLV", title: "Silver", attributes: { color: "Silver" }, price: 169.0, stockCount: 20 },
      ],
      specifications: [{ key: "Battery Life", value: "45 Hours" }, { key: "Connectivity", value: "Bluetooth 5.3 / 3.5mm Aux" }, { key: "Driver", value: "40mm Beryllium" }],
      stockCount: 50,
      rating: 4.9,
      numReviews: 88,
      isNewArrival: true,
      isTopSeller: true,
      featured: true,
    },
    {
      title: "Mechanical Hot-Swap 75% Keyboard",
      slug: "mechanical-hot-swap-75-keyboard",
      sku: "ELE-KB-002",
      brand: "KeyForge",
      description: "Gasket-mounted aluminum mechanical keyboard with factory-lubed linear switches and RGB backlighting.",
      shortDescription: "Gasket-mounted custom mechanical keyboard with hot-swap PCB.",
      categoryId: createdCategories["electronics"].id,
      basePrice: 149.0,
      hasVariants: true,
      images: [
        { url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80", alt: "Mechanical Keyboard", isPrimary: true, order: 0 },
      ],
      variants: [
        { id: "var-e3", sku: "ELE-KB-002-RED", title: "Linear Red Switches", attributes: { switch: "Linear Red" }, price: 149.0, stockCount: 15 },
        { id: "var-e4", sku: "ELE-KB-002-BRN", title: "Tactile Brown Switches", attributes: { switch: "Tactile Brown" }, price: 149.0, stockCount: 12 },
      ],
      specifications: [{ key: "Layout", value: "75% ANSI (82 Keys)" }, { key: "Case", value: "CNC Anodized Aluminum" }],
      stockCount: 27,
      rating: 4.8,
      numReviews: 36,
      isTopSeller: true,
    },
    {
      title: "Magnetic 3-in-1 Wireless Charging Stand",
      slug: "magnetic-3-in-1-wireless-charging-stand",
      sku: "ELE-CH-003",
      brand: "VoltSync",
      description: "Fast 15W Qi2 certified magnetic charging station for smartphone, smartwatch, and earbuds.",
      shortDescription: "15W fast wireless charging station for all your Apple & Android gear.",
      categoryId: createdCategories["electronics"].id,
      basePrice: 59.0,
      discountPrice: 49.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1622445262464-84b1456045b6?auto=format&fit=crop&w=800&q=80", alt: "Charging Stand", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Output", value: "15W Phone + 5W Watch + 5W Buds" }, { key: "Input", value: "USB-C PD 30W" }],
      stockCount: 45,
      rating: 4.5,
      numReviews: 22,
      isNewArrival: true,
    },
    {
      title: "Smart Home Environmental Sensor Hub",
      slug: "smart-home-environmental-sensor-hub",
      sku: "ELE-SM-004",
      brand: "AeroSense",
      description: "Precision temperature, humidity, VOC air quality, and barometric pressure monitor with Zigbee 3.0.",
      shortDescription: "Zigbee & Matter enabled smart indoor air quality monitor.",
      categoryId: createdCategories["electronics"].id,
      basePrice: 45.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80", alt: "Smart Sensor", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Protocol", value: "Zigbee 3.0 / Thread" }, { key: "Display", value: "E-Ink 2.9 inch" }],
      stockCount: 35,
      rating: 4.6,
      numReviews: 14,
    },

    // --- Wooden Toys & Crafts ---
    {
      title: "Handcrafted Montessori Sensory Activity Board",
      slug: "handcrafted-montessori-sensory-activity-board",
      sku: "TOY-MB-001",
      brand: "LittleSprout",
      description: "Natural solid beechwood activity busy board with latches, gears, counting beads, and tactile switches.",
      shortDescription: "Solid beechwood sensory busy board for toddlers (ages 1-4).",
      categoryId: createdCategories["toys"].id,
      basePrice: 75.0,
      discountPrice: 65.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80", alt: "Montessori Board", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Age Range", value: "12 months - 4 years" }, { key: "Wood Type", value: "FSC Certified Beechwood" }, { key: "Finish", value: "Non-toxic organic beeswax" }],
      dimensions: { length: 40, width: 30, height: 5, unit: "cm" },
      stockCount: 40,
      rating: 4.9,
      numReviews: 53,
      isNewArrival: true,
      isTopSeller: true,
      featured: true,
    },
    {
      title: "100-Piece Natural Geometric Building Blocks",
      slug: "100-piece-natural-geometric-building-blocks",
      sku: "TOY-BB-002",
      brand: "TimberPlay",
      description: "Unpainted organic maple and walnut building blocks set in a handcrafted canvas storage tote.",
      shortDescription: "100 solid hardwood geometric building blocks with organic finish.",
      categoryId: createdCategories["toys"].id,
      basePrice: 55.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80", alt: "Building Blocks", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Pieces", value: "100" }, { key: "Material", value: "Maple & Walnut Hardwood" }],
      stockCount: 28,
      rating: 4.8,
      numReviews: 31,
      isTopSeller: true,
    },
    {
      title: "Wooden Animal Balance Stacking Puzzle",
      slug: "wooden-animal-balance-stacking-puzzle",
      sku: "TOY-PZ-003",
      brand: "LittleSprout",
      description: "12 adorable safari animals sculpted from sustainably sourced basswood that balance and stack.",
      shortDescription: "Hand-carved wooden animal balance stacking game.",
      categoryId: createdCategories["toys"].id,
      basePrice: 32.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80", alt: "Animal Puzzle", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Material", value: "Sustainably Harvested Basswood" }, { key: "Safety", value: "ASTM F963 Certified" }],
      stockCount: 60,
      rating: 4.7,
      numReviews: 19,
      isNewArrival: true,
    },
    {
      title: "Solid Wood Toy Kitchenette Set",
      slug: "solid-wood-toy-kitchenette-set",
      sku: "TOY-KC-004",
      brand: "TimberPlay",
      description: "Stunning minimalist wooden play kitchen featuring opening oven, turning knobs, and stainless accessories.",
      shortDescription: "Heirloom-quality solid wood play kitchen for children.",
      categoryId: createdCategories["toys"].id,
      basePrice: 189.0,
      discountPrice: 169.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80", alt: "Play Kitchen", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Dimensions", value: "60 x 30 x 85 cm" }, { key: "Material", value: "Solid Birch & Poplar" }],
      stockCount: 15,
      rating: 4.9,
      numReviews: 12,
    },

    // --- Furniture ---
    {
      title: "Scandi Minimalist 3-Seater Sofa",
      slug: "scandi-minimalist-3-seater-sofa",
      sku: "FUR-SF-001",
      brand: "NordicHome",
      description: "Solid ash wood frame wrapped in stain-resistant high-resilience woven fabric with plush feather-fill cushions.",
      shortDescription: "Scandinavian 3-seater sofa with solid ash frame.",
      categoryId: createdCategories["furniture"].id,
      basePrice: 599.0,
      discountPrice: 499.0,
      hasVariants: true,
      images: [
        { url: "/images/modern-sofa.jpg", alt: "Modern Sofa", isPrimary: true, order: 0 },
        { url: "/images/living-room.jpg", alt: "Living Room Setup", isPrimary: false, order: 1 },
      ],
      variants: [
        { id: "var-f1", sku: "FUR-SF-001-OAT", title: "Oatmeal Beige", attributes: { color: "Oatmeal Beige" }, price: 499.0, stockCount: 8 },
        { id: "var-f2", sku: "FUR-SF-001-CHA", title: "Charcoal Grey", attributes: { color: "Charcoal Grey" }, price: 499.0, stockCount: 6 },
      ],
      specifications: [{ key: "Frame", value: "Kiln-Dried Solid Ash" }, { key: "Fabric", value: "Stain-Resistant Poly-Linen" }],
      dimensions: { length: 210, width: 90, height: 82, unit: "cm" },
      weightKg: 45.0,
      stockCount: 14,
      lowStockThreshold: 3,
      rating: 4.9,
      numReviews: 42,
      isNewArrival: true,
      isTopSeller: true,
      featured: true,
    },
    {
      title: "Solid Oak Dining Table",
      slug: "solid-oak-dining-table",
      sku: "FUR-DT-002",
      brand: "CraftsmanWood",
      description: "Handcrafted 6-person dining table showcasing natural wood grains with chamfered edges and matte oil finish.",
      shortDescription: "Solid European white oak 6-seater dining table.",
      categoryId: createdCategories["furniture"].id,
      basePrice: 349.0,
      discountPrice: 299.0,
      hasVariants: false,
      images: [
        { url: "/images/dining-table.jpg", alt: "Dining Table", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Seating", value: "6 Persons" }, { key: "Wood", value: "100% Solid White Oak" }],
      dimensions: { length: 180, width: 90, height: 75, unit: "cm" },
      weightKg: 52.0,
      stockCount: 10,
      rating: 4.8,
      numReviews: 29,
      isTopSeller: true,
    },
    {
      title: "Ergonomic Mid-Century Accent Chair",
      slug: "ergonomic-mid-century-accent-chair",
      sku: "FUR-CH-003",
      brand: "NordicHome",
      description: "Contoured walnut bentwood shell paired with genuine top-grain leather cushioning for all-day relaxation.",
      shortDescription: "Mid-century lounge accent chair with walnut shell and leather.",
      categoryId: createdCategories["furniture"].id,
      basePrice: 289.0,
      hasVariants: true,
      images: [
        { url: "/images/Chair.jpg", alt: "Accent Chair", isPrimary: true, order: 0 },
      ],
      variants: [
        { id: "var-f3", sku: "FUR-CH-003-COGNAC", title: "Cognac Brown Leather", attributes: { color: "Cognac Brown" }, price: 289.0, stockCount: 12 },
        { id: "var-f4", sku: "FUR-CH-003-BLACK", title: "Obsidian Black Leather", attributes: { color: "Obsidian Black" }, price: 289.0, stockCount: 9 },
      ],
      specifications: [{ key: "Leather", value: "Top-Grain Italian Leather" }, { key: "Frame", value: "Walnut Plywood" }],
      stockCount: 21,
      rating: 4.7,
      numReviews: 19,
      isNewArrival: true,
    },
    {
      title: "Modern Modular Bookshelf & Room Divider",
      slug: "modern-modular-bookshelf-room-divider",
      sku: "FUR-BS-004",
      brand: "CraftsmanWood",
      description: "5-tier open architecture shelving unit constructed from powder-coated steel and warm walnut veneers.",
      shortDescription: "5-tier open concept industrial modular shelving unit.",
      categoryId: createdCategories["furniture"].id,
      basePrice: 199.0,
      hasVariants: false,
      images: [
        { url: "/images/bookshelf.jpg", alt: "Bookshelf", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Tiers", value: "5 Shelves" }, { key: "Frame", value: "Steel & Walnut" }],
      stockCount: 18,
      rating: 4.6,
      numReviews: 15,
    },
    {
      title: "Minimalist Floating Nightstand Table",
      slug: "minimalist-floating-nightstand-table",
      sku: "FUR-NS-005",
      brand: "NordicHome",
      description: "Wall-mounted floating bedside table with concealed soft-close drawer and built-in cord management.",
      shortDescription: "Wall-mounted walnut floating nightstand with soft-close drawer.",
      categoryId: createdCategories["furniture"].id,
      basePrice: 79.0,
      hasVariants: false,
      images: [
        { url: "/images/nightstand.jpg", alt: "Nightstand", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Mounting", value: "French Cleat Wall Mount" }, { key: "Material", value: "Walnut Veneer" }],
      stockCount: 30,
      rating: 4.5,
      numReviews: 20,
    },

    // --- Miscellaneous & Accessories ---
    {
      title: "Full-Grain Italian Leather Desk Mat",
      slug: "full-grain-italian-leather-desk-mat",
      sku: "MSC-DM-001",
      brand: "KobenLeather",
      description: "Hand-stitched full-grain vegetable-tanned leather desk pad that develops a rich, unique patina over time.",
      shortDescription: "Full-grain vegetable-tanned leather oversized desk pad.",
      categoryId: createdCategories["misc"].id,
      basePrice: 68.0,
      discountPrice: 58.0,
      hasVariants: true,
      images: [
        { url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80", alt: "Leather Desk Mat", isPrimary: true, order: 0 },
      ],
      variants: [
        { id: "var-m1", sku: "MSC-DM-001-TAN", title: "Whiskey Tan (80x40cm)", attributes: { color: "Whiskey Tan", size: "80x40cm" }, price: 58.0, stockCount: 22 },
        { id: "var-m2", sku: "MSC-DM-001-BLK", title: "Midnight Black (80x40cm)", attributes: { color: "Midnight Black", size: "80x40cm" }, price: 58.0, stockCount: 16 },
      ],
      specifications: [{ key: "Leather Type", value: "Vegetable Tanned Full-Grain" }, { key: "Backing", value: "Non-slip Suede" }],
      stockCount: 38,
      rating: 4.9,
      numReviews: 38,
      isNewArrival: true,
      isTopSeller: true,
      featured: true,
    },
    {
      title: "Titanium EDC Minimalist Card Wallet",
      slug: "titanium-edc-minimalist-card-wallet",
      sku: "MSC-WL-002",
      brand: "ForgeTech",
      description: "Grade-5 aerospace titanium slim wallet with RFID blocking and integrated money clip.",
      shortDescription: "Grade-5 titanium RFID-blocking slim cardholder wallet.",
      categoryId: createdCategories["misc"].id,
      basePrice: 48.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80", alt: "Titanium Wallet", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Capacity", value: "Up to 12 cards + cash" }, { key: "Material", value: "Grade 5 Titanium" }],
      stockCount: 50,
      rating: 4.8,
      numReviews: 27,
      isTopSeller: true,
    },
    {
      title: "Double-Walled Insulated Ceramic Tumbler",
      slug: "double-walled-insulated-ceramic-tumbler",
      sku: "MSC-TM-003",
      brand: "AromaWare",
      description: "16oz ceramic-lined vacuum insulated stainless tumbler that keeps coffee piping hot for 8 hours without metallic taste.",
      shortDescription: "16oz ceramic-lined leak-proof travel mug and coffee tumbler.",
      categoryId: createdCategories["misc"].id,
      basePrice: 34.0,
      hasVariants: false,
      images: [
        { url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80", alt: "Ceramic Tumbler", isPrimary: true, order: 0 },
      ],
      specifications: [{ key: "Capacity", value: "16 oz / 475 ml" }, { key: "Thermal Retention", value: "Hot: 8h | Cold: 24h" }],
      stockCount: 42,
      rating: 4.7,
      numReviews: 34,
      isNewArrival: true,
    },
  ];

  for (const prod of productsData) {
    await prisma.product.create({
      data: {
        ...prod,
        status: ProductStatus.PUBLISHED,
      },
    });
  }

  // 6. Create Coupons
  console.log("🎟️ Seeding promotional coupons...");
  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        discountPercent: 10.0,
        minOrderValue: 50.0,
        maxDiscount: 25.0,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        usageLimit: 500,
        isActive: true,
      },
      {
        code: "SOPIFEST20",
        discountPercent: 20.0,
        minOrderValue: 100.0,
        maxDiscount: 50.0,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        usageLimit: 200,
        isActive: true,
      },
    ],
  });

  console.log("✨ Seeding completed successfully!");
  console.log("-----------------------------------------");
  console.log("🔑 Admin Credentials : admin@sopifest.com / Admin@123456");
  console.log("🔑 User Credentials  : user@sopifest.com  / User@123456");
  console.log("🏷️ Categories Seeded : 5");
  console.log(`📦 Products Seeded   : ${productsData.length}`);
  console.log("🎟️ Coupons Seeded    : 2 (WELCOME10, SOPIFEST20)");
  console.log("-----------------------------------------");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
