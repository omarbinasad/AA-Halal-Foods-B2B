import { siteConfig } from "@/config/site";
import type { ShippingZone, StoreSettings } from "@/lib/types";

/*
 * DEMO store settings and SAMPLE shipping zones/rates. The amounts are illustrative only —
 * not real courier prices. Stored on globalThis like the other demo stores: edits survive
 * page refreshes but are lost when the server restarts.
 */
const at = "2026-01-05T09:00:00+06:00";

const seedSettings: StoreSettings = {
  storeName: siteConfig.name,
  email: siteConfig.contact.email,
  // Sample number in a valid Bangladesh format (the site config placeholder is not dialable).
  phone: "+880 1700-000000",
  address: {
    addressLine1: "House 00, Road 00 (sample)",
    area: "Tejgaon",
    district: "Dhaka",
    division: "Dhaka",
    postalCode: "1208",
    country: "BD",
  },
  currency: "BDT",
  timeZone: "Asia/Dhaka",
  weightUnit: "kg",
  dimensionUnit: "cm",
  updatedAt: at,
};

const seedZones: ShippingZone[] = [
  {
    id: "zone-uttara",
    name: "Uttara hub (postcode zone)",
    locations: [{ type: "postcode", postalCode: "1230" }],
    isFallback: false,
    methods: [
      { id: "m-uttara-flat", name: "Hub delivery", enabled: true, type: "flat_rate", cost: 100, classAdjustments: [{ shippingClassId: "ship-frozen", amount: 150, per: "order" }] },
      { id: "m-uttara-pickup", name: "Collect from Uttara hub", enabled: true, type: "local_pickup", cost: 0, instructions: "Sample hub address — collection Sat–Thu 10:00–17:00." },
    ],
    createdAt: at,
    updatedAt: at,
  },
  {
    id: "zone-dhaka-city",
    name: "Dhaka city",
    locations: [{ type: "district", division: "Dhaka", district: "Dhaka" }],
    isFallback: false,
    methods: [
      {
        id: "m-dhaka-flat",
        name: "Standard delivery",
        enabled: true,
        type: "flat_rate",
        cost: 150,
        classAdjustments: [
          { shippingClassId: "ship-frozen", amount: 200, per: "order" },
          { shippingClassId: "ship-heavy", amount: 20, per: "unit" },
        ],
      },
      { id: "m-dhaka-free", name: "Free delivery over ৳15,000", enabled: true, type: "free_shipping", minSubtotal: 15000 },
      { id: "m-dhaka-pickup", name: "Collect from the store", enabled: true, type: "local_pickup", cost: 0, instructions: "Warehouse counter, Sat–Thu 9:00–18:00 (sample)." },
    ],
    createdAt: at,
    updatedAt: at,
    legacyWooId: 3,
  },
  {
    id: "zone-greater-dhaka",
    name: "Greater Dhaka",
    locations: [
      { type: "district", division: "Dhaka", district: "Gazipur" },
      { type: "district", division: "Dhaka", district: "Narayanganj" },
    ],
    isFallback: false,
    methods: [
      {
        id: "m-gd-weight",
        name: "Delivery by weight",
        enabled: true,
        type: "weight_tiers",
        tiers: [
          { from: 0, cost: 250 },
          { from: 50_000, cost: 450 },
          { from: 200_000, cost: 800 },
        ],
        classAdjustments: [{ shippingClassId: "ship-frozen", amount: 300, per: "order" }],
      },
      { id: "m-gd-free", name: "Free delivery over ৳25,000", enabled: true, type: "free_shipping", minSubtotal: 25000 },
    ],
    createdAt: at,
    updatedAt: at,
  },
  {
    id: "zone-chattogram",
    name: "Chattogram division",
    locations: [{ type: "division", division: "Chattogram" }],
    isFallback: false,
    methods: [
      {
        id: "m-ctg-subtotal",
        name: "Delivery by order value",
        enabled: true,
        type: "subtotal_tiers",
        tiers: [
          { from: 0, cost: 600 },
          { from: 10000, cost: 350 },
          { from: 30000, cost: 0 },
        ],
        classAdjustments: [{ shippingClassId: "ship-frozen", amount: 400, per: "order" }],
      },
    ],
    createdAt: at,
    updatedAt: at,
    legacyWooId: 4,
  },
  {
    id: "zone-fallback",
    name: "Rest of Bangladesh",
    locations: [],
    isFallback: true,
    methods: [
      {
        id: "m-rest-weight",
        name: "Courier by weight",
        enabled: true,
        type: "weight_tiers",
        tiers: [
          { from: 0, cost: 400 },
          { from: 20_000, cost: 700 },
          { from: 100_000, cost: 1500 },
        ],
        classAdjustments: [
          { shippingClassId: "ship-frozen", amount: 600, per: "order" },
          { shippingClassId: "ship-heavy", amount: 50, per: "unit" },
        ],
      },
    ],
    createdAt: at,
    updatedAt: at,
  },
];

const store = globalThis as typeof globalThis & { __mockShippingV1?: { settings: StoreSettings; zones: ShippingZone[] } };
store.__mockShippingV1 ??= { settings: seedSettings, zones: seedZones };

export const mockShipping = store.__mockShippingV1;
