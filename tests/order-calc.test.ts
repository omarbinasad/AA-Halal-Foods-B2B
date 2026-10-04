/**
 * Order calculation tests. Run with `npm test` (Node's built-in test runner,
 * TypeScript via --experimental-strip-types; no extra packages).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lineAmounts, orderTotals, previewAdjustment, sumMoney, toPaisa, type LineInput, type TaxRates } from "../src/lib/orders/calc.ts";

const rates: TaxRates = { standard: 15, reduced: 5, exempt: 0 };
const kg = (value: number) => ({ value, unit: "kg" as const });
const line = (over: Partial<LineInput> = {}): LineInput => ({
  quantity: 1,
  unitPrice: 100,
  discount: 0,
  pricedByWeight: false,
  orderedWeight: kg(1),
  ...over,
});

describe("money", () => {
  it("converts taka to integer paisa without float noise", () => {
    assert.equal(toPaisa(0.1 + 0.2), 30);
    assert.equal(toPaisa(1150.5), 115050);
    assert.equal(toPaisa(-19.99), -1999);
  });
  it("sums amounts exactly", () => {
    assert.equal(sumMoney([0.1, 0.2, 0.3]), 0.6);
    assert.equal(sumMoney([19.99, 19.99, 19.99]), 59.97);
  });
});

describe("line amounts", () => {
  it("multiplies quantity by unit price", () => {
    assert.deepEqual(lineAmounts(line({ quantity: 3, unitPrice: 1150.5 })), { subtotal: 3451.5, discount: 0, total: 3451.5 });
  });
  it("handles quantity changes, including zero", () => {
    assert.equal(lineAmounts(line({ quantity: 7, unitPrice: 19.99 })).total, 139.93);
    assert.equal(lineAmounts(line({ quantity: 0, unitPrice: 19.99 })).total, 0);
  });
  it("rejects fractional quantities", () => {
    assert.throws(() => lineAmounts(line({ quantity: 1.5 })));
  });
  it("applies a line discount but never goes below zero", () => {
    assert.equal(lineAmounts(line({ quantity: 2, unitPrice: 500, discount: 120.25 })).total, 879.75);
    assert.equal(lineAmounts(line({ unitPrice: 50, discount: 80 })).total, 0);
  });
  it("scales weight-priced lines by fulfilled / ordered weight", () => {
    // 5 packs × ৳1,120, ordered 10 kg, packed 10.4 kg → 5600 × 1.04
    const l = line({ quantity: 5, unitPrice: 1120, pricedByWeight: true, orderedWeight: kg(10), fulfilledWeight: kg(10.4) });
    assert.equal(lineAmounts(l).total, 5824);
  });
  it("mixes units (g vs kg) correctly", () => {
    const l = line({ unitPrice: 1000, pricedByWeight: true, orderedWeight: kg(2), fulfilledWeight: { value: 1850, unit: "g" } });
    assert.equal(lineAmounts(l).total, 925);
  });
  it("ignores fulfilled weight for lines not priced by weight", () => {
    const l = line({ quantity: 2, unitPrice: 2300, orderedWeight: kg(3.2), fulfilledWeight: kg(3.4) });
    assert.equal(lineAmounts(l).total, 4600);
  });
  it("rounds half-up to the paisa exactly once", () => {
    // 0.01 × 1500 g / 1000 g = 0.015 → 0.02
    assert.equal(lineAmounts(line({ unitPrice: 0.01, pricedByWeight: true, orderedWeight: kg(1), fulfilledWeight: kg(1.5) })).total, 0.02);
    // 100 × 1/3 = 33.333… → 33.33
    assert.equal(lineAmounts(line({ unitPrice: 100, pricedByWeight: true, orderedWeight: kg(3), fulfilledWeight: kg(1) })).total, 33.33);
    // 100 × 2/3 = 66.666… → 66.67
    assert.equal(lineAmounts(line({ unitPrice: 100, pricedByWeight: true, orderedWeight: kg(3), fulfilledWeight: kg(2) })).total, 66.67);
  });
});

describe("order totals", () => {
  it("adds items, shipping and VAT per class (incl. shipping in its class)", () => {
    const totals = orderTotals(
      {
        lines: [
          { ...line({ quantity: 2, unitPrice: 4200 }), taxClass: "reduced" },
          { ...line({ quantity: 1, unitPrice: 2100 }), taxClass: "standard" },
          { ...line({ quantity: 4, unitPrice: 620 }), taxClass: "exempt" },
        ],
        shipping: { amount: 350, taxClass: "standard" },
      },
      rates,
    );
    assert.equal(totals.itemsTotal, 12980);
    assert.deepEqual(
      totals.taxes.map((t) => [t.taxClass, t.taxableAmount, t.taxAmount]),
      [["reduced", 8400, 420], ["standard", 2450, 367.5]],
    );
    assert.equal(totals.taxTotal, 787.5);
    assert.equal(totals.total, 14117.5);
  });
  it("supports decimal VAT rates and rounds tax half-up", () => {
    // 7.5 % of 333.33 = 24.99975 → 25.00
    const totals = orderTotals({ lines: [{ ...line({ unitPrice: 333.33 }), taxClass: "standard" }], shipping: { amount: 0, taxClass: "standard" } }, { ...rates, standard: 7.5 });
    assert.equal(totals.taxTotal, 25);
  });
  it("reports discounts and refunds separately", () => {
    const totals = orderTotals(
      { lines: [{ ...line({ quantity: 2, unitPrice: 1000, discount: 100 }), taxClass: "exempt" }], shipping: { amount: 0, taxClass: "standard" }, refunds: [500, 250.5] },
      rates,
    );
    assert.equal(totals.itemsSubtotal, 2000);
    assert.equal(totals.discountTotal, 100);
    assert.equal(totals.total, 1900);
    assert.equal(totals.refundedTotal, 750.5);
    assert.equal(totals.netTotal, 1149.5);
  });
});

describe("adjustment preview", () => {
  const input = {
    lines: [
      { ...line({ quantity: 5, unitPrice: 1120, pricedByWeight: true, orderedWeight: kg(10) }), taxClass: "reduced" as const },
      { ...line({ quantity: 2, unitPrice: 780 }), taxClass: "reduced" as const },
    ],
    shipping: { amount: 0, taxClass: "standard" as const },
  };
  it("recalculates the line and order after a weight change", () => {
    const p = previewAdjustment(input, 0, { fulfilledWeight: kg(10.4) }, rates);
    assert.equal(p.lineBefore.total, 5600);
    assert.equal(p.lineAfter.total, 5824);
    // VAT 5 %: before (5600 + 1560) × 1.05 = 7518; after (5824 + 1560) × 1.05 = 7753.2
    assert.equal(p.totalBefore, 7518);
    assert.equal(p.totalAfter, 7753.2);
    assert.equal(p.difference, 235.2);
  });
  it("recalculates after an agreed unit-price change", () => {
    const p = previewAdjustment(input, 1, { unitPrice: 750 }, rates);
    assert.equal(p.lineAfter.total, 1500);
    assert.equal(p.difference, -63);
  });
  it("combines price and weight changes on a weight-priced line", () => {
    const p = previewAdjustment(input, 0, { unitPrice: 1100, fulfilledWeight: kg(9.5) }, rates);
    assert.equal(p.lineAfter.total, 5225);
  });
});
