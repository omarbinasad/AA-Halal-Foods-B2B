/** Tax matching, calculation and validation. Run with `npm test`. Rates here are fictional. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OrderTaxSnapshot, TaxRate } from "../src/lib/types/index.ts";
import { buildTaxSnapshot, calculateTax, matchTaxRate, taxOn, validateTaxRate, validateTaxSettings, type TaxLineInput } from "../src/lib/tax/engine.ts";

const T0 = "2026-01-01T00:00:00+06:00";
const rate = (id: string, over: Partial<TaxRate>): TaxRate => ({ id, name: id, percent: 10, taxClass: "standard", location: { type: "country", country: "BD" }, enabled: true, createdAt: T0, updatedAt: T0, ...over });

const rates: TaxRate[] = [
  rate("bd-std", { percent: 10 }),
  rate("bd-red", { percent: 4, taxClass: "reduced" }),
  rate("ctg-std", { percent: 9.5, location: { type: "division", division: "Chattogram" } }),
  rate("gazipur-std", { percent: 8, location: { type: "district", division: "Dhaka", district: "Gazipur" } }),
  rate("uttara-std", { percent: 7.5, location: { type: "postcode", postalCode: "1230" } }),
  rate("off", { percent: 50, location: { type: "division", division: "Dhaka" }, enabled: false }),
];
const classes = ["standard", "reduced", "exempt"] as const;

describe("rate matching", () => {
  it("prefers postcode, then district, then division, then the country fallback", () => {
    assert.equal(matchTaxRate(rates, "standard", { division: "Dhaka", district: "Dhaka", postalCode: "1230" }).rate?.id, "uttara-std");
    assert.equal(matchTaxRate(rates, "standard", { division: "Dhaka", district: "gazipur" }).rate?.id, "gazipur-std");
    assert.equal(matchTaxRate(rates, "standard", { division: "Chattogram", district: "Cumilla" }).rate?.id, "ctg-std");
    const m = matchTaxRate(rates, "standard", { division: "Dhaka", district: "Dhaka", postalCode: "1212" });
    assert.equal(m.rate?.id, "bd-std"); // disabled Dhaka-division rate ignored
    assert.equal(m.level, "country");
  });

  it("matches per class; exempt is never taxed; no fallback → untaxed", () => {
    assert.equal(matchTaxRate(rates, "reduced", { division: "Dhaka", district: "Gazipur" }).rate?.id, "bd-red");
    assert.equal(matchTaxRate(rates, "exempt", { division: "Dhaka", district: "Gazipur" }).rate, undefined);
    assert.equal(matchTaxRate(rates.filter((r) => r.id !== "bd-red"), "reduced", { division: "Sylhet", district: "Sylhet" }).rate, undefined);
  });
});

const snap = (over: Partial<OrderTaxSnapshot> = {}): OrderTaxSnapshot => ({
  ...buildTaxSnapshot({ enabled: true, pricesIncludeTax: false, shippingTaxable: false, shippingTaxClass: "standard" }, rates, { division: "Dhaka", district: "Dhaka", postalCode: "1212" }, [...classes], T0),
  ...over,
});
const line = (over: Partial<TaxLineInput>): TaxLineInput => ({ key: "l", label: "l", taxClass: "standard", taxable: true, subtotal: 1000, discount: 0, ...over });

describe("calculation", () => {
  it("adds tax on top when prices exclude tax, after discounts", () => {
    const r = calculateTax(snap(), [line({ subtotal: 1000, discount: 100 })], 0);
    assert.equal(r.itemsTotal, 900);
    assert.equal(r.groups[0].taxableAmount, 900);
    assert.equal(r.taxTotal, 90);
    assert.equal(r.total, 990);
    assert.equal(r.netTotal, 900);
  });

  it("extracts tax when prices include tax (total unchanged)", () => {
    const r = calculateTax(snap({ pricesIncludeTax: true }), [line({ subtotal: 1100 })], 0);
    assert.equal(r.taxTotal, 100); // 1100 × 10/110
    assert.equal(r.groups[0].taxableAmount, 1000);
    assert.equal(r.total, 1100);
    assert.equal(r.netTotal, 1000);
  });

  it("uses the variation's class when it overrides the product (caller passes the effective class)", () => {
    const r = calculateTax(snap(), [line({ key: "a", subtotal: 1000, taxClass: "standard" }), line({ key: "b", subtotal: 1000, taxClass: "reduced" })], 0);
    assert.deepEqual(r.groups.map((g) => [g.rate.rateId, g.taxAmount]), [["bd-std", 100], ["bd-red", 40]]);
    assert.equal(r.taxTotal, 140);
  });

  it("groups lines per rate and rounds half-up once per rate", () => {
    // 3 lines of 0.15 at 10 % → per line 0.015 each; per rate 0.45 × 10 % = 0.045 → 0.05
    const r = calculateTax(snap(), [line({ key: "a", subtotal: 0.15 }), line({ key: "b", subtotal: 0.15 }), line({ key: "c", subtotal: 0.15 })], 0);
    assert.equal(r.taxTotal, 0.05);
    assert.equal(taxOn(5, 10, false), 1); // 0.5 paisa → 1 (half-up)
    assert.equal(taxOn(4, 10, false), 0);
  });

  it("handles fractional rates exactly", () => {
    const s = buildTaxSnapshot({ enabled: true, pricesIncludeTax: false, shippingTaxable: false, shippingTaxClass: "standard" }, rates, { division: "Dhaka", district: "Dhaka", postalCode: "1230" }, [...classes], T0);
    assert.equal(calculateTax(s, [line({ subtotal: 999.99 })], 0).taxTotal, 75); // 74.99925 → 75.00
  });

  it("taxes shipping only when configured, at the shipping class rate", () => {
    assert.equal(calculateTax(snap(), [line({ subtotal: 1000 })], 200).taxTotal, 100); // not taxable
    const s = buildTaxSnapshot({ enabled: true, pricesIncludeTax: false, shippingTaxable: true, shippingTaxClass: "reduced" }, rates, { division: "Dhaka", district: "Dhaka" }, [...classes], T0);
    const r = calculateTax(s, [line({ subtotal: 1000 })], 200);
    assert.equal(r.shipping.rate?.rateId, "bd-red");
    assert.equal(r.taxTotal, 108); // 100 on items + 8 on shipping
    assert.equal(r.total, 1308);
  });

  it("taxes inclusive shipping consistently with inclusive prices", () => {
    const s = buildTaxSnapshot({ enabled: true, pricesIncludeTax: true, shippingTaxable: true, shippingTaxClass: "standard" }, rates, { division: "Dhaka", district: "Dhaka" }, [...classes], T0);
    const r = calculateTax(s, [line({ subtotal: 1100 })], 110);
    assert.equal(r.taxTotal, 110); // (1100 + 110) × 10/110
    assert.equal(r.total, 1210);
  });

  it("skips non-taxable products, exempt lines and everything when tax is off", () => {
    const r = calculateTax(snap(), [line({ key: "a", taxable: false }), line({ key: "b", taxClass: "exempt" }), line({ key: "c" })], 0);
    assert.equal(r.taxTotal, 100);
    assert.match(r.lines[0].note, /not taxable/);
    const off = calculateTax(snap({ enabled: false }), [line({})], 50);
    assert.equal(off.taxTotal, 0);
    assert.equal(off.total, 1050);
  });

  it("never lets a discount exceed the line", () => {
    assert.equal(calculateTax(snap(), [line({ subtotal: 100, discount: 150 })], 0).total, 0);
  });
});

describe("validation", () => {
  const base = { name: "Rate", percent: 10, taxClass: "standard" as const, location: { type: "division" as const, division: "Dhaka" }, enabled: true };
  it("checks ranges, classes and locations", () => {
    assert.ok(validateTaxRate({ ...base, percent: 101 }, [], [...classes]).percent);
    assert.ok(validateTaxRate({ ...base, percent: -1 }, [], [...classes]).percent);
    assert.ok(validateTaxRate({ ...base, percent: 7.555 }, [], [...classes]).percent);
    assert.ok(validateTaxRate({ ...base, taxClass: "exempt" }, [], [...classes]).taxClass);
    assert.ok(validateTaxRate({ ...base, location: { type: "postcode", postalCode: "12" } }, [], [...classes]).location);
    assert.ok(validateTaxRate({ ...base, location: { type: "division", division: "Atlantis" } }, [], [...classes]).location);
    assert.deepEqual(validateTaxRate({ ...base, percent: 0 }, [], [...classes]), {}); // zero-rated is allowed
  });

  it("rejects a second enabled rate for the same class and location, but allows a disabled one or another class", () => {
    const others = [rate("dhaka", { location: { type: "division", division: "Dhaka" } })];
    assert.match(validateTaxRate({ ...base, location: { type: "division", division: " dhaka " } }, others, [...classes]).location, /already covers/);
    assert.deepEqual(validateTaxRate({ ...base, enabled: false }, others, [...classes]), {});
    assert.deepEqual(validateTaxRate({ ...base, taxClass: "reduced" }, others, [...classes]), {});
  });

  it("requires a non-exempt shipping class when shipping is taxable", () => {
    assert.ok(validateTaxSettings({ enabled: true, pricesIncludeTax: false, shippingTaxable: true, shippingTaxClass: "exempt" }, [...classes]).shippingTaxClass);
    assert.deepEqual(validateTaxSettings({ enabled: true, pricesIncludeTax: false, shippingTaxable: false, shippingTaxClass: "exempt" }, [...classes]), {});
  });
});
