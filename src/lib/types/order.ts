import type { LegacyRef, ProductType, StockInfo, TaxClass } from "./catalog";
import type { ID, ISODateString, Money, Weight } from "./common";
import type { Address } from "./customer";
import type { ShippingDecision } from "./shipping";
import type { OrderTaxSnapshot } from "./tax";

export interface CartItem {
  id: ID;
  productId: ID;
  variationId?: ID;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  taxClass: TaxClass;
  weight: Weight;
  isVariableWeight: boolean;
}

export interface Cart {
  id: ID;
  customerId: ID;
  items: CartItem[];
  subtotal: Money;
  estimatedWeight: Weight;
  updatedAt: ISODateString;
}

// --- Statuses -----------------------------------------------------------------------

/** Main delivery flow received → preparing → on_the_way → delivered; cancelled is separate. */
export type OrderStatus = "received" | "preparing" | "on_the_way" | "delivered" | "cancelled";

export type PaymentStatus = "unpaid" | "invoiced" | "paid" | "partially_refunded" | "refunded";

export type PaymentMethod = "cash_on_delivery" | "bank_transfer" | "mobile_wallet" | "invoice";

/** Who did something (for history and audit). */
export interface Actor {
  id: ID;
  name: string;
  role: "admin" | "customer" | "system";
}

export interface StatusEvent {
  id: ID;
  status: OrderStatus;
  at: ISODateString;
  by: Actor;
  /** e.g. the cancellation reason. */
  note?: string;
}

// --- Items --------------------------------------------------------------------------

/**
 * One ordered line. Product details are SNAPSHOTS taken when the order was
 * placed, so later catalog edits (name, SKU, price, weight) never rewrite it.
 */
export interface OrderItem extends LegacyRef {
  id: ID;
  /** References for linking only — never re-read for display or totals. */
  productId: ID;
  variationId?: ID;
  name: string;
  sku: string;
  /** Selected variation options, e.g. { Size: "20 kg" }. */
  attributes?: Record<string, string>;
  unitLabel: string;
  taxClass: TaxClass;
  /** Price follows the packed weight (variable-weight products). */
  pricedByWeight: boolean;
  quantity: number;
  /** Catalog price per unit when ordered (snapshot, for reference). */
  catalogUnitPrice: Money;
  /** Agreed price per unit; may be adjusted by an admin. */
  unitPrice: Money;
  /** Line discount (taka); 0 when none. */
  discount: Money;
  /** quantity × unit weight at order time. */
  orderedWeight: Weight;
  /** Actual packed weight, once weighed/adjusted. */
  fulfilledWeight?: Weight;
  /** Derived from the fields above (see src/lib/orders/calc.ts). */
  lineSubtotal: Money;
  lineTotal: Money;
  /** Snapshot of the price rule outcome at order time; later rule edits never change it. */
  pricing?: OrderItemPricing;
  /** Product tax status at order time: false for "none" / "shipping only". Absent = taxable. */
  taxable?: boolean;
}

export interface OrderItemPricing {
  /** Regular catalog price when ordered. */
  basePrice: Money;
  /** Active sale price when ordered, if any. */
  salePrice?: Money;
  /** Price the winning rule produced, when a rule applied. */
  rulePrice?: Money;
  /** Suggested unit price: the lower of the rule price and the active sale price, else the regular price. */
  ruleUnitPrice: Money;
  /** Where the suggested price came from (sale and rule discounts are never combined). */
  source: "rule" | "sale" | "regular";
  ruleId?: ID;
  ruleName?: string;
  tier?: { minQuantity: number; maxQuantity?: number };
  /** True when staff agreed a different unit price than the rule price. */
  manualOverride: boolean;
}

export interface TaxLine {
  taxClass: TaxClass;
  /** Rate as a percentage, as configured in the backend tax settings. */
  rate: number;
  /** Amount taxed, excluding tax. */
  taxableAmount: Money;
  taxAmount: Money;
  /** Rate snapshot (orders created with tax settings); absent on older orders using placeholder class rates. */
  rateId?: ID;
  rateName?: string;
}

export interface ShippingCharge {
  label: string;
  /** The amount saved with the order. Never recalculated when shipping rules change. */
  amount: Money;
  taxClass: TaxClass;
  deliveryRouteId?: ID;
  /** Admin-created orders: whether staff used the suggested charge or agreed a manual one. */
  decision?: ShippingDecision;
}

export interface PaymentDetails {
  method: PaymentMethod;
  /** Gateway / bank reference, when known. */
  reference?: string;
  paidAt?: ISODateString;
}

/** A recorded refund. Processing happens in the future payments module; this only stores what happened. */
export interface Refund {
  id: ID;
  amount: Money;
  reason: string;
  at: ISODateString;
  by: Actor;
  /** "recorded" = noted here only; "processed" = confirmed by the payment provider (backend). */
  status: "recorded" | "processed";
}

export type OrderNoteType = "admin" | "customer";

export interface OrderNote {
  id: ID;
  /** admin = staff only; customer = visible to the customer in their account. */
  type: OrderNoteType;
  body: string;
  at: ISODateString;
  by: Actor;
}

/** Audit record of an admin changing an item's fulfilled weight and/or agreed unit price. */
export interface OrderAdjustment {
  id: ID;
  orderItemId: ID;
  /** Item name at the time (for readable history). */
  itemName: string;
  reason: string;
  at: ISODateString;
  by: Actor;
  before: { unitPrice: Money; fulfilledWeight?: Weight; lineTotal: Money; orderTotal: Money };
  after: { unitPrice: Money; fulfilledWeight?: Weight; lineTotal: Money; orderTotal: Money };
}

export interface OrderTotals {
  itemsSubtotal: Money;
  discountTotal: Money;
  /** Net sales: items after discounts, excl. VAT and shipping. */
  itemsTotal: Money;
  shippingTotal: Money;
  taxTotal: Money;
  total: Money;
  refundedTotal: Money;
  netTotal: Money;
  /** true when the order's prices included tax (tax was extracted, not added). */
  taxIncluded?: boolean;
}

export interface Order extends LegacyRef {
  id: ID;
  number: string;
  customerId: ID;
  /** Customer company name at the time of the order (snapshot, for lists and search). */
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: OrderStatus;
  statusHistory: StatusEvent[];
  paymentStatus: PaymentStatus;
  payment: PaymentDetails;
  items: OrderItem[];
  billingAddress: Address;
  shippingAddress: Address;
  shipping: ShippingCharge;
  taxes: TaxLine[];
  totals: OrderTotals;
  /** Tax settings and matched rates frozen at order time; recalculation uses these, never current rates. */
  taxSnapshot?: OrderTaxSnapshot;
  refunds: Refund[];
  notes: OrderNote[];
  adjustments: OrderAdjustment[];
  /** Note the customer wrote when ordering. */
  customerNote?: string;
  requestedDeliveryDate?: ISODateString;
  createdVia: "storefront" | "admin";
  createdBy?: Actor;
  placedAt: ISODateString;
  updatedAt: ISODateString;
}

// --- Admin payloads -----------------------------------------------------------------

/** Address fields entered/edited for an order (snapshotted onto it). */
export type OrderAddressInput = Omit<Address, "id" | "type" | "isDefault" | "label" | "legacyWooId">;

export interface CreateOrderInput {
  customerId: ID;
  billingAddress: OrderAddressInput;
  shippingAddress: OrderAddressInput;
  items: { productId: ID; variationId?: ID; quantity: number; unitPrice: Money; discount: Money }[];
  shipping: { label: string; amount: Money; mode: "suggested" | "manual"; reason?: string };
  paymentMethod: PaymentMethod;
  customerNote?: string;
  adminNote?: string;
  requestedDeliveryDate?: string;
}

export interface AdjustItemInput {
  itemId: ID;
  unitPrice?: Money;
  fulfilledWeight?: Weight;
  reason: string;
}

/** One purchasable option (the product itself, or one variation) for the admin order form. */
export interface OrderableOption {
  variationId?: ID;
  /** e.g. "Size: 5 kg"; empty for simple products. */
  label: string;
  sku: string;
  available: boolean;
  stock: StockInfo;
  taxClass: TaxClass;
  weight: Weight;
  catalogPrice: Money;
  /** Price this customer would pay at the minimum quantity (price rules applied). */
  customerPrice: Money;
  /** Per-line quantity limits from the quantity rules. */
  minQuantity: number;
  maxQuantity?: number;
}

/** Rule outcome for one order line at a given quantity (DEMO calculation; the backend enforces it). */
export interface OrderLineQuote {
  unitPrice: Money;
  /** Regular price. */
  basePrice: Money;
  salePrice?: Money;
  /** Winning rule's price, when a rule applied (the sale price may still be lower). */
  rulePrice?: Money;
  priceSource: "rule" | "sale" | "regular";
  ruleName?: string;
  /** e.g. "10+" or "5–9". */
  tierLabel?: string;
  minQuantity: number;
  maxQuantity?: number;
  quantityError?: string;
}

export interface OrderableProduct {
  productId: ID;
  name: string;
  type: ProductType;
  unitLabel: string;
  pricedByWeight: boolean;
  options: OrderableOption[];
}

/** Customer details the admin order form needs: addresses and a suggested delivery charge. */
export interface OrderCustomerContext {
  id: ID;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addresses: Address[];
}
