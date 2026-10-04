/**
 * Pure order calculations (no I/O, no runtime imports), shared by the admin UI
 * previews, the mock repository and the unit tests in `tests/order-calc.test.ts`.
 *
 * Money representation: `Money` values are BDT in taka with at most 2 decimals.
 * All arithmetic here happens in exact integer paisa (BigInt), and results are
 * rounded once, half-up, to the paisa. Never add/multiply `Money` floats directly.
 *
 * The backend owns the real rules (tax rates, rounding policy, discounts); this
 * module mirrors the agreed behaviour so previews match what will be saved.
 */
import type { TaxClass, TaxLine, Weight } from "@/lib/types";

// --- Money ------------------------------------------------------------------------

/** taka (≤ 2 decimals) → integer paisa. Uses the 2-decimal string form, so 0.1 + 0.2 style float noise is removed. */
export function toPaisa(amount: number): number {
  if (!Number.isFinite(amount)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const paisa = Number(whole) * 100 + Number(fraction);
  return amount < 0 ? -paisa : paisa;
}

/** integer paisa → taka. */
export const fromPaisa = (paisa: number): number => paisa / 100;

/** Exact half-up rounding of numerator/denominator (both non-negative BigInts) to an integer. */
function divRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const two = BigInt(2);
  return (numerator * two + denominator) / (denominator * two);
}

/** Sum of Money values without float drift. */
export const sumMoney = (amounts: number[]): number => fromPaisa(amounts.reduce((s, a) => s + toPaisa(a), 0));

// --- Weight -----------------------------------------------------------------------

export const toGrams = (w: Weight): number => Math.round(w.value * (w.unit === "kg" ? 1000 : 1));

// --- Lines --------------------------------------------------------------------------

export interface LineInput {
  quantity: number;
  /** Agreed price per selling unit (taka). */
  unitPrice: number;
  /** Line discount (taka); 0 when none. */
  discount: number;
  /** Price follows the packed weight (e.g. fresh meat). */
  pricedByWeight: boolean;
  orderedWeight: Weight;
  /** Actual packed weight; undefined = not weighed yet (ordered weight applies). */
  fulfilledWeight?: Weight;
}

export interface LineAmounts {
  /** unitPrice × quantity (× fulfilled/ordered weight for weight-priced lines). */
  subtotal: number;
  discount: number;
  /** subtotal − discount, never below 0. */
  total: number;
}

/**
 * Line amounts. For weight-priced lines the price scales with the fulfilled
 * weight: unitPrice × qty × fulfilledGrams / orderedGrams, rounded half-up once.
 * For other lines a different fulfilled weight changes shipping data only.
 */
export function lineAmounts(line: LineInput): LineAmounts {
  if (!Number.isInteger(line.quantity) || line.quantity < 0) throw new Error(`Invalid quantity: ${line.quantity}`);
  const unit = BigInt(toPaisa(line.unitPrice));
  const qty = BigInt(line.quantity);
  let subtotal = unit * qty;
  if (line.pricedByWeight && line.fulfilledWeight) {
    const ordered = toGrams(line.orderedWeight);
    const fulfilled = toGrams(line.fulfilledWeight);
    if (ordered > 0) subtotal = divRoundHalfUp(subtotal * BigInt(fulfilled), BigInt(ordered));
  }
  const subtotalPaisa = Number(subtotal);
  const discountPaisa = Math.min(Math.max(0, toPaisa(line.discount)), subtotalPaisa);
  return {
    subtotal: fromPaisa(subtotalPaisa),
    discount: fromPaisa(discountPaisa),
    total: fromPaisa(subtotalPaisa - discountPaisa),
  };
}

// --- Orders -------------------------------------------------------------------------

/** VAT rate per class as a percentage (may have decimals, e.g. 7.5). Placeholder until the tax module exists. */
export type TaxRates = Record<TaxClass, number>;

export interface TotalsInput {
  lines: (LineInput & { taxClass: TaxClass })[];
  shipping: { amount: number; taxClass: TaxClass };
  /** Recorded refund amounts (taka). */
  refunds?: number[];
}

export interface OrderTotals {
  itemsSubtotal: number;
  discountTotal: number;
  /** Items after line discounts (net sales, excl. VAT and shipping). */
  itemsTotal: number;
  shippingTotal: number;
  taxes: TaxLine[];
  taxTotal: number;
  /** itemsTotal + shipping + VAT. */
  total: number;
  refundedTotal: number;
  /** total − refunds. */
  netTotal: number;
}

/** Tax per class on (line totals + shipping in its class), rounded half-up per class. */
export function orderTotals(input: TotalsInput, rates: TaxRates): OrderTotals {
  const lines = input.lines.map((l) => ({ taxClass: l.taxClass, ...lineAmounts(l) }));
  const taxable = new Map<TaxClass, number>();
  const add = (cls: TaxClass, paisa: number) => taxable.set(cls, (taxable.get(cls) ?? 0) + paisa);
  for (const l of lines) add(l.taxClass, toPaisa(l.total));
  const shippingPaisa = Math.max(0, toPaisa(input.shipping.amount));
  if (shippingPaisa > 0) add(input.shipping.taxClass, shippingPaisa);

  const taxes: TaxLine[] = [];
  for (const [taxClass, base] of taxable) {
    const rate = rates[taxClass] ?? 0;
    if (base <= 0 || rate <= 0) continue;
    // Rate in basis points keeps decimal rates (7.5 %) exact.
    const bp = BigInt(Math.round(rate * 100));
    const tax = Number(divRoundHalfUp(BigInt(base) * bp, BigInt(10000)));
    taxes.push({ taxClass, rate, taxableAmount: fromPaisa(base), taxAmount: fromPaisa(tax) });
  }

  const itemsSubtotal = lines.reduce((s, l) => s + toPaisa(l.subtotal), 0);
  const discountTotal = lines.reduce((s, l) => s + toPaisa(l.discount), 0);
  const itemsTotal = itemsSubtotal - discountTotal;
  const taxTotal = taxes.reduce((s, t) => s + toPaisa(t.taxAmount), 0);
  const total = itemsTotal + shippingPaisa + taxTotal;
  const refunded = (input.refunds ?? []).reduce((s, r) => s + toPaisa(r), 0);
  return {
    itemsSubtotal: fromPaisa(itemsSubtotal),
    discountTotal: fromPaisa(discountTotal),
    itemsTotal: fromPaisa(itemsTotal),
    shippingTotal: fromPaisa(shippingPaisa),
    taxes,
    taxTotal: fromPaisa(taxTotal),
    total: fromPaisa(total),
    refundedTotal: fromPaisa(refunded),
    netTotal: fromPaisa(total - refunded),
  };
}

// --- Adjustments --------------------------------------------------------------------

export interface AdjustmentChange {
  /** New agreed unit price; undefined = unchanged. */
  unitPrice?: number;
  /** New fulfilled (packed) weight; undefined = unchanged. */
  fulfilledWeight?: Weight;
}

export interface AdjustmentPreview {
  lineBefore: LineAmounts;
  lineAfter: LineAmounts;
  totalBefore: number;
  totalAfter: number;
  /** totalAfter − totalBefore. */
  difference: number;
}

/**
 * Before/after amounts for adjusting one line. `lines[index]` is the line being
 * changed; everything else (other lines, shipping, refunds) stays the same.
 */
export function previewAdjustment(input: TotalsInput, index: number, change: AdjustmentChange, rates: TaxRates): AdjustmentPreview {
  const line = input.lines[index];
  if (!line) throw new Error(`No line at index ${index}`);
  const changed = {
    ...line,
    unitPrice: change.unitPrice ?? line.unitPrice,
    fulfilledWeight: change.fulfilledWeight ?? line.fulfilledWeight,
  };
  const before = orderTotals(input, rates);
  const after = orderTotals({ ...input, lines: input.lines.map((l, i) => (i === index ? changed : l)) }, rates);
  return {
    lineBefore: lineAmounts(line),
    lineAfter: lineAmounts(changed),
    totalBefore: before.total,
    totalAfter: after.total,
    difference: fromPaisa(toPaisa(after.total) - toPaisa(before.total)),
  };
}

/** True when a Money value has at most 2 decimals and is ≥ 0. */
export const isValidAmount = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && Math.abs(toPaisa(v) / 100 - v) < 1e-9;
