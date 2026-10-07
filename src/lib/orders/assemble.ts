/**
 * Keeps an order's derived money fields (line amounts, tax lines, totals) in sync with its
 * items, shipping and refunds. Orders with a tax snapshot (created with tax settings) are
 * recalculated from that snapshot; older orders keep the placeholder per-class rates.
 */
import { calculateTax, type TaxCalculation } from "@/lib/tax/engine";
import type { Order, OrderItem, TaxLine } from "@/lib/types";
import { fromPaisa, lineAmounts, orderTotals, toPaisa, type AdjustmentChange, type AdjustmentPreview, type TaxRates, type TotalsInput } from "./calc";

type Recalculable = Pick<Order, "items" | "shipping" | "refunds"> & Partial<Pick<Order, "taxSnapshot">>;

export function totalsInput(order: Recalculable): TotalsInput {
  return {
    lines: order.items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount,
      pricedByWeight: i.pricedByWeight,
      orderedWeight: i.orderedWeight,
      fulfilledWeight: i.fulfilledWeight,
      taxClass: i.taxClass,
    })),
    shipping: { amount: order.shipping.amount, taxClass: order.shipping.taxClass },
    refunds: order.refunds.map((r) => r.amount),
  };
}

/** Tax calculation for an order with a snapshot (weight-priced lines scaled first). */
export function snapshotTax(order: Recalculable): TaxCalculation {
  return calculateTax(
    order.taxSnapshot!,
    order.items.map((i) => {
      const a = lineAmounts(i);
      return { key: i.id, label: i.name, taxClass: i.taxClass, taxable: i.taxable !== false, subtotal: a.subtotal, discount: a.discount };
    }),
    order.shipping.amount,
  );
}

/** Returns a copy with line amounts, `taxes` and `totals` recalculated. */
export function recalculate<T extends Recalculable>(order: T, rates: TaxRates): T & Pick<Order, "taxes" | "totals"> {
  const items: OrderItem[] = order.items.map((i) => {
    const a = lineAmounts(i);
    return { ...i, lineSubtotal: a.subtotal, lineTotal: a.total };
  });
  if (order.taxSnapshot) {
    const t = snapshotTax({ ...order, items });
    const refunded = order.refunds.reduce((s, r) => s + toPaisa(r.amount), 0);
    const netByLine = new Map(t.lines.map((l) => [l.key, l.net]));
    const withNet = items.map((i) => ({ ...i, lineNet: netByLine.get(i.id) ?? i.lineTotal }));
    const taxes: TaxLine[] = t.groups.map((g) => ({ taxClass: g.rate.taxClass, rate: g.rate.percent, taxableAmount: g.taxableAmount, taxAmount: g.taxAmount, rateId: g.rate.rateId, rateName: g.rate.name }));
    return {
      ...order,
      items: withNet,
      taxes,
      totals: {
        itemsSubtotal: t.itemsSubtotal,
        discountTotal: t.discountTotal,
        itemsTotal: t.itemsTotal,
        shippingTotal: t.shippingTotal,
        taxTotal: t.taxTotal,
        total: t.total,
        refundedTotal: fromPaisa(refunded),
        netTotal: fromPaisa(toPaisa(t.total) - refunded),
        taxIncluded: t.pricesIncludeTax || undefined,
        itemsNet: t.itemsNet,
        itemsTax: t.itemsTax,
      },
    };
  }
  const { taxes, ...totals } = orderTotals(totalsInput({ ...order, items }), rates);
  return { ...order, items, taxes, totals };
}

/** Before/after amounts for adjusting one item, using the order's own tax basis. */
export function previewOrderAdjustment(order: Recalculable, index: number, change: AdjustmentChange, rates: TaxRates): AdjustmentPreview {
  const item = order.items[index];
  if (!item) throw new Error(`No item at index ${index}`);
  const changed = { ...item, unitPrice: change.unitPrice ?? item.unitPrice, fulfilledWeight: change.fulfilledWeight ?? item.fulfilledWeight };
  const before = recalculate(order, rates).totals.total;
  const after = recalculate({ ...order, items: order.items.map((it, i) => (i === index ? changed : it)) }, rates).totals.total;
  return {
    lineBefore: lineAmounts(item),
    lineAfter: lineAmounts(changed),
    totalBefore: before,
    totalAfter: after,
    difference: fromPaisa(toPaisa(after) - toPaisa(before)),
  };
}
