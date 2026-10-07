import type { TaxRate, TaxSettings } from "@/lib/types";

/*
 * DEMO tax settings and FICTIONAL rates. None of these percentages is the current
 * Bangladesh legal rate — every rate name says so. Stored on globalThis like the other
 * demo stores: edits survive page refreshes but are lost when the server restarts.
 */
const at = "2026-01-05T09:00:00+06:00";

const seedSettings: TaxSettings = {
  // OFF until an admin deliberately enables it (Admin → Tax). The rates below are fictional examples.
  enabled: false,
  pricesIncludeTax: false,
  // Not assumed: shipping is untaxed until an admin turns it on.
  shippingTaxable: false,
  shippingTaxClass: "standard",
  updatedAt: at,
};

const rate = (id: string, r: Omit<TaxRate, "id" | "createdAt" | "updatedAt">): TaxRate => ({ id, ...r, createdAt: at, updatedAt: at });

const seedRates: TaxRate[] = [
  rate("tax-bd-standard", { name: "Demo standard rate (fictional)", percent: 10, taxClass: "standard", location: { type: "country", country: "BD" }, enabled: true, legacyWooId: 1 }),
  rate("tax-bd-reduced", { name: "Demo reduced rate (fictional)", percent: 4, taxClass: "reduced", location: { type: "country", country: "BD" }, enabled: true, legacyWooId: 2 }),
  rate("tax-ctg-standard", { name: "Demo Chattogram standard (fictional)", percent: 9.5, taxClass: "standard", location: { type: "division", division: "Chattogram" }, enabled: true }),
  rate("tax-gazipur-standard", { name: "Demo Gazipur standard (fictional)", percent: 8, taxClass: "standard", location: { type: "district", division: "Dhaka", district: "Gazipur" }, enabled: true }),
  rate("tax-uttara-standard", { name: "Demo Uttara postcode standard (fictional)", percent: 7.5, taxClass: "standard", location: { type: "postcode", postalCode: "1230" }, enabled: true }),
  rate("tax-sylhet-reduced", { name: "Demo Sylhet reduced (fictional, disabled)", percent: 3, taxClass: "reduced", location: { type: "division", division: "Sylhet" }, enabled: false }),
];

const store = globalThis as typeof globalThis & { __mockTaxV1?: { settings: TaxSettings; rates: TaxRate[] } };
store.__mockTaxV1 ??= { settings: seedSettings, rates: seedRates };

export const mockTax = store.__mockTaxV1;
