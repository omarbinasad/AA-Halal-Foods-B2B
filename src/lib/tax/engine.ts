/**
 * Tax rate matching and calculation — pure functions with only type imports (plus the
 * shared money helpers), so they run in the browser, the mock repository and `npm test`.
 * The backend performs the authoritative calculation and must follow the same rules.
 * Demo rates are FICTIONAL.
 *
 * MATCHING (per tax class, one rate per line — rates never stack):
 *   enabled rates of the line's class, by the most specific location that matches the address:
 *     1. exact postcode   2. district (within its division)   3. division   4. country (fallback)
 *   A class + location pair may have only one enabled rate (validated), so each step finds at
 *   most one. No match → the line is untaxed (shown as "no rate"). The "exempt" class is never taxed.
 *
 * CALCULATION (integer paisa):
 *   - Line amount = unit price × quantity − line discount (discounts always come BEFORE tax),
 *     rounded half-up to the paisa per line (weight-priced lines are scaled by the caller).
 *   - Lines (and shipping, when taxable) are grouped by the rate that applied. Tax is calculated
 *     once per rate on the group's combined amount and rounded half-up to the paisa:
 *        prices exclude tax:  tax = amount × p / 100;           total = amounts + tax
 *        prices include tax:  tax = amount × p / (100 + p);     total = amounts (tax already inside)
 *   - Order tax = Σ rate taxes. Shipping uses the same inclusive/exclusive setting as prices.
 */
import type { AppliedTaxRate, FieldErrors, ID, OrderTaxSnapshot, TaxClass, TaxLocation, TaxRate, TaxRateInput, TaxSettings } from "@/lib/types";
import { fromPaisa, isValidAmount, toPaisa } from "../orders/calc.ts";

export const TAX_DIVISIONS = ["Barishal", "Chattogram", "Dhaka", "Khulna", "Mymensingh", "Rajshahi", "Rangpur", "Sylhet"] as const;

const norm = (s?: string) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export interface TaxAddress {
  division: string;
  district: string;
  postalCode?: string;
  country?: string;
}

export const locationLevelLabel: Record<TaxLocation["type"], string> = {
  postcode: "exact postcode",
  district: "district",
  division: "division",
  country: "country (fallback)",
};

export function taxLocationLabel(l: TaxLocation) {
  if (l.type === "postcode") return `Postcode ${l.postalCode}`;
  if (l.type === "district") return `${l.district}, ${l.division}`;
  if (l.type === "division") return `${l.division} division`;
  return "All of Bangladesh";
}

// --- Matching -------------------------------------------------------------------------------

export interface RateMatch {
  rate?: TaxRate;
  level?: TaxLocation["type"];
  explanation: string;
}

export function matchTaxRate(rates: TaxRate[], taxClass: TaxClass, address: TaxAddress): RateMatch {
  if (taxClass === "exempt") return { explanation: "Exempt class — never taxed." };
  const pool = rates.filter((r) => r.enabled && r.taxClass === taxClass);
  const country = (address.country ?? "BD").toUpperCase();
  const steps: [TaxLocation["type"], (l: TaxLocation) => boolean][] = [
    ["postcode", (l) => !!address.postalCode && l.type === "postcode" && norm(l.postalCode) === norm(address.postalCode)],
    ["district", (l) => l.type === "district" && norm(l.district) === norm(address.district) && norm(l.division) === norm(address.division)],
    ["division", (l) => l.type === "division" && norm(l.division) === norm(address.division)],
    ["country", (l) => l.type === "country" && l.country === country],
  ];
  for (const [level, test] of steps) {
    const rate = pool.find((r) => test(r.location));
    if (rate) return { rate, level, explanation: `“${rate.name}” (${rate.percent}%) matched by ${locationLevelLabel[level]}.` };
  }
  return { explanation: `No enabled ${taxClass} rate matches this address (and no country-wide fallback), so it is untaxed.` };
}

const applied = (m: RateMatch): AppliedTaxRate | undefined =>
  m.rate && { rateId: m.rate.id, name: m.rate.name, percent: m.rate.percent, taxClass: m.rate.taxClass, matchedBy: m.level! };

/** Settings + matched rates for one address, frozen for an order. */
export function buildTaxSnapshot(settings: Pick<TaxSettings, "enabled" | "pricesIncludeTax" | "shippingTaxable" | "shippingTaxClass">, rates: TaxRate[], address: TaxAddress, classes: TaxClass[], capturedAt: string): OrderTaxSnapshot {
  const ratesByClass: OrderTaxSnapshot["ratesByClass"] = {};
  for (const c of classes) {
    const a = applied(matchTaxRate(rates, c, address));
    if (a) ratesByClass[c] = a;
  }
  return {
    enabled: settings.enabled,
    pricesIncludeTax: settings.pricesIncludeTax,
    shippingTaxable: settings.shippingTaxable,
    ratesByClass,
    shippingRate: settings.shippingTaxable ? applied(matchTaxRate(rates, settings.shippingTaxClass, address)) : undefined,
    capturedAt,
  };
}

// --- Calculation ------------------------------------------------------------------------------

export interface TaxLineInput {
  key: string;
  label: string;
  taxClass: TaxClass;
  /** false for products whose tax status is "none" or "shipping only". */
  taxable: boolean;
  /** Before discount (as entered). */
  subtotal: number;
  discount: number;
}

export interface TaxLineResult extends TaxLineInput {
  /** subtotal − discount, as entered (includes tax when prices include tax). */
  amount: number;
  rate?: AppliedTaxRate;
  note: string;
}

export interface TaxGroup {
  rate: AppliedTaxRate;
  /** Amount the tax is calculated on, excluding tax. */
  taxableAmount: number;
  taxAmount: number;
  /** Lines (keys) and/or "shipping" in this group. */
  members: string[];
}

export interface TaxCalculation {
  enabled: boolean;
  pricesIncludeTax: boolean;
  lines: TaxLineResult[];
  shipping: { amount: number; taxable: boolean; rate?: AppliedTaxRate; note: string };
  groups: TaxGroup[];
  itemsSubtotal: number;
  discountTotal: number;
  /** Items after discounts, as entered. */
  itemsTotal: number;
  shippingTotal: number;
  taxTotal: number;
  /** Payable total. */
  total: number;
  /** Total excluding tax. */
  netTotal: number;
}

function divRoundHalfUp(numerator: bigint, denominator: bigint) {
  const two = BigInt(2);
  return (numerator * two + denominator) / (denominator * two);
}

/** Tax in paisa on an amount in paisa for a percentage (basis points keep 7.5 % exact). */
export function taxOn(amountPaisa: number, percent: number, inclusive: boolean) {
  if (amountPaisa <= 0 || percent <= 0) return 0;
  const bp = BigInt(Math.round(percent * 100));
  const amount = BigInt(amountPaisa);
  return Number(inclusive ? divRoundHalfUp(amount * bp, BigInt(10000) + bp) : divRoundHalfUp(amount * bp, BigInt(10000)));
}

export function calculateTax(snapshot: Pick<OrderTaxSnapshot, "enabled" | "pricesIncludeTax" | "shippingTaxable" | "ratesByClass" | "shippingRate">, lines: TaxLineInput[], shippingAmount: number): TaxCalculation {
  const inclusive = snapshot.pricesIncludeTax;
  const groups = new Map<ID, { rate: AppliedTaxRate; amount: number; members: string[] }>();
  const add = (rate: AppliedTaxRate, paisa: number, member: string) => {
    const g = groups.get(rate.rateId) ?? { rate, amount: 0, members: [] };
    g.amount += paisa;
    g.members.push(member);
    groups.set(rate.rateId, g);
  };

  let subtotal = 0;
  let discount = 0;
  const lineResults: TaxLineResult[] = lines.map((l) => {
    const s = toPaisa(l.subtotal);
    const d = Math.min(Math.max(0, toPaisa(l.discount)), s);
    subtotal += s;
    discount += d;
    const amount = s - d;
    if (!snapshot.enabled) return { ...l, amount: fromPaisa(amount), note: "Tax is turned off." };
    if (!l.taxable) return { ...l, amount: fromPaisa(amount), note: "Product is not taxable (tax status)." };
    if (l.taxClass === "exempt") return { ...l, amount: fromPaisa(amount), note: "Exempt class." };
    const rate = snapshot.ratesByClass[l.taxClass];
    if (!rate) return { ...l, amount: fromPaisa(amount), note: `No ${l.taxClass} rate for this address.` };
    add(rate, amount, l.key);
    return { ...l, amount: fromPaisa(amount), rate, note: `${rate.name} · ${rate.percent}%` };
  });

  const shipPaisa = Math.max(0, toPaisa(shippingAmount));
  let shipping: TaxCalculation["shipping"];
  if (!snapshot.enabled) shipping = { amount: fromPaisa(shipPaisa), taxable: false, note: "Tax is turned off." };
  else if (!snapshot.shippingTaxable) shipping = { amount: fromPaisa(shipPaisa), taxable: false, note: "Shipping is not taxable (tax settings)." };
  else if (!snapshot.shippingRate) shipping = { amount: fromPaisa(shipPaisa), taxable: true, note: "Shipping is taxable but no rate matches this address." };
  else {
    if (shipPaisa > 0) add(snapshot.shippingRate, shipPaisa, "shipping");
    shipping = { amount: fromPaisa(shipPaisa), taxable: true, rate: snapshot.shippingRate, note: `${snapshot.shippingRate.name} · ${snapshot.shippingRate.percent}%` };
  }

  let taxPaisa = 0;
  const groupResults: TaxGroup[] = [...groups.values()].map((g) => {
    const tax = taxOn(g.amount, g.rate.percent, inclusive);
    taxPaisa += tax;
    return { rate: g.rate, taxableAmount: fromPaisa(inclusive ? g.amount - tax : g.amount), taxAmount: fromPaisa(tax), members: g.members };
  });

  const itemsTotal = subtotal - discount;
  const enteredTotal = itemsTotal + shipPaisa;
  const total = inclusive ? enteredTotal : enteredTotal + taxPaisa;
  return {
    enabled: snapshot.enabled,
    pricesIncludeTax: inclusive,
    lines: lineResults,
    shipping,
    groups: groupResults,
    itemsSubtotal: fromPaisa(subtotal),
    discountTotal: fromPaisa(discount),
    itemsTotal: fromPaisa(itemsTotal),
    shippingTotal: fromPaisa(shipPaisa),
    taxTotal: fromPaisa(taxPaisa),
    total: fromPaisa(total),
    netTotal: fromPaisa(total - taxPaisa),
  };
}

// --- Validation -------------------------------------------------------------------------------

const locationKey = (l: TaxLocation) =>
  l.type === "postcode" ? `postcode:${norm(l.postalCode)}` : l.type === "district" ? `district:${norm(l.division)}|${norm(l.district)}` : l.type === "division" ? `division:${norm(l.division)}` : `country:${l.country}`;

/** Validates a rate against the other rates and the known classes. */
export function validateTaxRate(input: TaxRateInput, others: TaxRate[], classes: TaxClass[]): FieldErrors {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = "Name the rate (at least 2 characters).";
  else if (name.length > 80) errors.name = "Keep it under 80 characters.";
  if (!(Number.isFinite(input.percent) && input.percent >= 0 && input.percent <= 100 && isValidAmount(input.percent)))
    errors.percent = "Enter a percentage from 0 to 100 (up to 2 decimals).";
  if (!classes.includes(input.taxClass)) errors.taxClass = "Choose an existing tax class.";
  else if (input.taxClass === "exempt") errors.taxClass = "The exempt class is never taxed — choose another class.";
  const l = input.location;
  if (l.type === "postcode" && !/^\d{4}$/.test(l.postalCode.trim())) errors.location = "Use a 4-digit postcode.";
  if ((l.type === "division" || l.type === "district") && !TAX_DIVISIONS.some((d) => norm(d) === norm(l.division))) errors.location = "Choose a division.";
  if (l.type === "district" && !l.district.trim()) errors.location = "Enter the district.";
  if (l.type === "country" && l.country !== "BD") errors.location = "Only Bangladesh is supported.";
  if (!errors.location && !errors.taxClass && input.enabled) {
    const clash = others.find((r) => r.enabled && r.taxClass === input.taxClass && locationKey(r.location) === locationKey(l));
    if (clash) errors.location = `“${clash.name}” already covers ${taxLocationLabel(l)} for this class. Only one enabled rate per class and location.`;
  }
  return errors;
}

export function validateTaxSettings(input: Pick<TaxSettings, "enabled" | "pricesIncludeTax" | "shippingTaxable" | "shippingTaxClass">, classes: TaxClass[]): FieldErrors {
  const errors: FieldErrors = {};
  if (!classes.includes(input.shippingTaxClass)) errors.shippingTaxClass = "Choose an existing tax class.";
  else if (input.shippingTaxable && input.shippingTaxClass === "exempt") errors.shippingTaxClass = "Taxable shipping needs a class with rates (not exempt).";
  return errors;
}
