import type { DimensionUnit, LegacyRef } from "./catalog";
import type { ID, ISODateString, Money } from "./common";

/*
 * Store settings and shipping zones/methods. Matching and calculation live in the
 * pure engine (src/lib/shipping/engine.ts); the backend must repeat them at cart,
 * checkout and order creation. All demo rates are sample values.
 */

/** Where the store ships from. Separate from a product's country of origin. */
export interface StoreAddress {
  addressLine1: string;
  addressLine2?: string;
  /** Upazila, thana or locality. */
  area?: string;
  district: string;
  division: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2; Bangladesh in this version. */
  country: "BD";
}

export interface StoreSettings {
  storeName: string;
  email?: string;
  phone?: string;
  address: StoreAddress;
  /** Fixed for this store version; changing them needs a backend migration. */
  currency: "BDT";
  timeZone: "Asia/Dhaka";
  /** Default units for new products and how weights are displayed. */
  weightUnit: "kg" | "g";
  dimensionUnit: DimensionUnit;
  updatedAt: ISODateString;
}

export type StoreSettingsInput = Pick<StoreSettings, "storeName" | "email" | "phone" | "address" | "weightUnit" | "dimensionUnit">;

/** One place a zone covers. Matching is by specificity: postcode > district > division. */
export type ZoneLocation =
  | { type: "division"; division: string }
  | { type: "district"; division: string; district: string }
  | { type: "postcode"; postalCode: string };

/** Extra charge when the cart contains items of a shipping class. */
export interface ClassAdjustment {
  shippingClassId: ID;
  amount: Money;
  /** Once per order, or per unit of that class. */
  per: "order" | "unit";
}

/**
 * Rate tier: applies from `from` (inclusive) up to the next tier's `from` (exclusive).
 * Tiers are strictly increasing and the first starts at 0, so there are no gaps or overlaps.
 * Weight tiers use grams; subtotal tiers use taka.
 */
export interface RateTier {
  from: number;
  cost: Money;
}

interface MethodBase {
  id: ID;
  name: string;
  enabled: boolean;
}

export type ShippingMethod =
  | (MethodBase & { type: "flat_rate"; cost: Money; classAdjustments: ClassAdjustment[] })
  | (MethodBase & { type: "weight_tiers"; tiers: RateTier[]; classAdjustments: ClassAdjustment[] })
  | (MethodBase & { type: "subtotal_tiers"; tiers: RateTier[]; classAdjustments: ClassAdjustment[] })
  /** Free delivery when the items subtotal is at least `minSubtotal`. */
  | (MethodBase & { type: "free_shipping"; minSubtotal: Money })
  /** Customer collects from the store; offered next to delivery, never chosen automatically. */
  | (MethodBase & { type: "local_pickup"; cost: Money; instructions?: string });

export type ShippingMethodType = ShippingMethod["type"];

export interface ShippingZone extends LegacyRef {
  id: ID;
  name: string;
  /** Empty for the fallback zone. */
  locations: ZoneLocation[];
  /** Exactly one zone is the fallback: it matches any address no other zone matches. */
  isFallback: boolean;
  methods: ShippingMethod[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type ShippingZoneInput = Pick<ShippingZone, "name" | "locations" | "methods">;

/** Address fields used for matching (customer and order addresses fit this shape). */
export interface ShippingAddress {
  division: string;
  district: string;
  postalCode?: string;
}

/** Cart line for a shipping quote. */
export interface ShippingCartLine {
  productId: ID;
  variationId?: ID;
  quantity: number;
  /** Agreed/rule unit price; when omitted the repository uses the customer or catalog price. */
  unitPrice?: Money;
  /** Line discount (taka); the shipping subtotal is after line discounts. */
  discount?: Money;
}

/** How an admin-created order's shipping amount was decided (kept with the order). */
export interface ShippingDecision {
  mode: "suggested" | "manual";
  /** What the shipping rules suggested at the time (may be absent if nothing was available). */
  suggestedAmount?: Money;
  zoneId?: ID;
  zoneName?: string;
  methodId?: ID;
  methodName?: string;
  /** Required for manual amounts. */
  reason?: string;
}
