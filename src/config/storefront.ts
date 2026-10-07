import type { Route } from "next";

/**
 * Storefront Home content and images — the one place to change homepage copy and
 * imagery. Brand name, logo and contact details stay in `site.ts`.
 *
 * IMAGES: put files in /public/images and set the path here (e.g. "/images/hero.webp").
 * `null` renders a clearly labelled placeholder. Never use external URLs or the design
 * screenshot itself.
 */
export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Image paths. All null until the supplied assets are added to /public/images. */
export const storefrontImages: {
  hero: ImageAsset | null;
  owner: ImageAsset | null;
  delivery: ImageAsset | null;
  /** Keyed by category slug; categories can also carry their own image from the catalog. */
  categories: Record<string, ImageAsset | null>;
  journal: Record<string, ImageAsset | null>;
} = {
  hero: null,
  owner: null,
  delivery: null,
  categories: {},
  journal: {},
};

/** File names to drop into /public/images (shown on the placeholders). */
export const expectedImageFiles = {
  hero: "hero.webp (wide warehouse/delivery scene, about 1920×700)",
  owner: "owner.webp (portrait, about 640×800)",
  delivery: "delivery.webp (delivery truck, about 960×540)",
  category: (slug: string) => `category-${slug}.webp (about 480×360)`,
  journal: (key: string) => `journal-${key}.webp (about 480×360)`,
};

export const homeContent = {
  topBar: "Wholesale halal groceries for businesses across Bangladesh",
  hero: {
    eyebrow: "Trusted halal wholesale supplier",
    title: "Reliable halal supply for your business",
    description: "Halal groceries, wholesale pricing for approved businesses, and scheduled delivery across Bangladesh.",
    chips: ["Halal products", "Wholesale pricing", "Scheduled delivery", "Dedicated support"],
    cta: { label: "Explore product catalog", href: "/shop" as Route },
  },
  benefits: [
    { icon: "halal", title: "Halal products", text: "A wide range of halal groceries" },
    { icon: "coins", title: "Wholesale pricing", text: "Business prices after account approval" },
    { icon: "truck", title: "Scheduled delivery", text: "Delivery routes with set days and cutoffs" },
    { icon: "support", title: "Dedicated support", text: "Our team helps with orders and accounts" },
  ] as const,
  business: {
    eyebrow: "For food businesses",
    title: "Built for food businesses",
    text: "Wholesale supply with customer-specific pricing, case quantities and support for restaurants, grocers and caterers.",
    cta: { label: "Learn more about us", href: "/about" as Route },
    cards: [
      { icon: "invoice", title: "Pay on delivery or bank transfer", text: "Payment options shown at checkout once ordering opens." },
      { icon: "repeat", title: "Quick repeat orders", text: "Find products by name or SKU and build your order fast." },
      { icon: "support", title: "Dedicated assistance", text: "Talk to our team about your account and orders." },
      { icon: "box", title: "Case quantities", text: "Minimum and maximum quantities per product line." },
    ] as const,
  },
  delivery: {
    eyebrow: "Delivery information",
    title: "Plan your stock. We'll plan the delivery.",
    text: "Choose your division to see the delivery route, delivery days and order cutoff.",
  },
  steps: [
    { title: "Create an account", text: "Fill in the business application form." },
    { title: "Submit business details", text: "Tell us about your business and delivery address." },
    { title: "Get approved", text: "We review and approve your application." },
    { title: "See trade prices", text: "Approved accounts see wholesale prices and quantity rules." },
  ],
  /** SAMPLE journal teasers — articles are not written yet, so these are not links. */
  journal: [
    { key: "stocking", tag: "Business tips", title: "Stocking essentials for your restaurant", text: "Key halal ingredients a restaurant kitchen should keep in stock." },
    { key: "pack-sizes", tag: "Wholesale guide", title: "Choosing the right wholesale pack sizes", text: "How to pick pack sizes that fit your storage and turnover." },
    { key: "repeat-orders", tag: "Ordering tips", title: "Making repeat orders easier", text: "Ways to streamline restocking and keep your business running." },
  ],
  contactStrip: { title: "Let's grow your business together.", text: "Join our wholesale network across Bangladesh.", cta: { label: "Contact our team", href: "/contact" as Route } },
};
