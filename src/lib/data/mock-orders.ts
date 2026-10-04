import "server-only";

import { formatMoney } from "@/lib/format";
import { previewOrderAdjustment, recalculate } from "@/lib/orders/assemble";
import { canAdjust, canTransition, orderStatusLabels } from "@/lib/orders/status";
import type { Address, Order, OrderAddressInput, OrderStatus } from "@/lib/types";
import { validateAdjustment, validateCreateOrder, ORDER_LIMITS } from "@/lib/validation/order";
import { mockProducts } from "./mock/catalog";
import { mockCustomers } from "./mock/customers";
import { mockOrders, pricingSnapshot, snapshotItem } from "./mock/orders";
import { mockShippingRepository } from "./mock-shipping";
import { mockTaxRepository } from "./mock-tax";
import { checkQuantity, tierLabel } from "@/lib/pricing/engine";
import { mockTaxRates, quantityLimitsFor, quotePrice } from "./mock/pricing-rules";
import { matches, paginate, sortBy, withinDates, type SortKey } from "./mock-utils";
import type { OrderRepository, SaveResult } from "./repositories";

/*
 * DEMO STORE: orders live in memory (globalThis) — changes survive page refreshes
 * but not a server restart. The real backend persists them, enforces permissions,
 * checks stock and applies real tax/shipping rules.
 */

const SHIPPING_TAX_CLASS = "standard" as const;
const statusRank: Record<OrderStatus, number> = { received: 0, preparing: 1, on_the_way: 2, delivered: 3, cancelled: 4 };

const now = () => new Date().toISOString();
const clone = <T>(v: T): T => structuredClone(v);
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const toAddress = (a: OrderAddressInput, type: Address["type"], label: string): Address => ({
  id: id("addr"),
  type,
  label,
  isDefault: false,
  recipientName: a.recipientName.trim(),
  companyName: a.companyName?.trim() || undefined,
  country: a.country || "BD",
  division: a.division.trim(),
  district: a.district.trim(),
  area: a.area?.trim() || undefined,
  postalCode: a.postalCode.trim(),
  addressLine1: a.addressLine1.trim(),
  addressLine2: a.addressLine2?.trim() || undefined,
  phone: a.phone.trim(),
});

function nextNumber() {
  const max = Math.max(0, ...mockOrders.map((o) => Number(o.number.replace(/\D/g, "")) || 0));
  return max + 1;
}

/** Replaces the stored order and returns a copy. */
function store(order: Order): SaveResult<Order> {
  const index = mockOrders.findIndex((o) => o.id === order.id);
  if (index >= 0) mockOrders[index] = order;
  else mockOrders.unshift(order);
  return { ok: true, value: clone(order) };
}

const notFound = { ok: false as const, errors: {}, message: "Order not found." };

export const mockOrderRepository: OrderRepository = {
  async list({ customerId, status, paymentStatus, deliveryRouteId, search, from, to, sort = "placed", dir, page, perPage } = {}) {
    const filtered = mockOrders.filter(
      (o) =>
        (!customerId || o.customerId === customerId) &&
        (!status || o.status === status) &&
        (!paymentStatus || o.paymentStatus === paymentStatus) &&
        (!deliveryRouteId || o.shipping.deliveryRouteId === deliveryRouteId) &&
        withinDates(o.placedAt, { from, to }) &&
        matches(search, o.number, o.customerName),
    );
    const key = (o: Order): SortKey => {
      switch (sort) {
        case "number": return Number(o.number.replace(/\D/g, ""));
        case "customer": return o.customerName;
        case "total": return o.totals.total;
        case "status": return statusRank[o.status];
        default: return o.placedAt;
      }
    };
    const defaultDir = sort === "placed" || sort === "total" ? "desc" : "asc";
    return paginate(sortBy(filtered, key, dir ?? defaultDir), page, perPage);
  },

  async getById(orderId, customerId) {
    const o = mockOrders.find((x) => x.id === orderId && (!customerId || x.customerId === customerId));
    return o ? clone(o) : null;
  },

  async calculationSettings() {
    return { taxRates: { ...mockTaxRates }, shippingTaxClass: SHIPPING_TAX_CLASS };
  },

  async searchCustomers(term, limit = 10) {
    return mockCustomers
      .filter((c) => c.status === "approved" && matches(term, c.companyName, c.contactName, c.email, c.phone))
      .slice(0, Math.min(limit, 25))
      .map((c) => ({ id: c.id, companyName: c.companyName, contactName: c.contactName, phone: c.phone, email: c.email }));
  },

  async customerContext(customerId) {
    const c = mockCustomers.find((x) => x.id === customerId && x.status === "approved");
    if (!c) return null;
    return {
      id: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      email: c.email,
      phone: c.phone,
      addresses: clone(c.addresses),
    };
  },

  async orderableProduct(productId, customerId) {
    const product = mockProducts.find((p) => p.id === productId && p.status !== "archived");
    const customer = mockCustomers.find((c) => c.id === customerId && c.status === "approved");
    if (!product || !customer) return null;
    // Default price at the line's minimum quantity; the form re-quotes when the quantity changes (bulk tiers).
    const option = (variationId?: string) => {
      const limits = quantityLimitsFor(product, variationId);
      return { customerPrice: quotePrice(product, customer, variationId, limits.min)!.unitPrice, minQuantity: limits.min, maxQuantity: limits.max };
    };
    const options =
      product.type === "variable"
        ? product.variations
            .filter((v) => v.basePrice !== undefined)
            .map((v) => ({
              variationId: v.id,
              label: Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(", "),
              sku: v.sku,
              available: v.status === "active",
              stock: { ...v.stock },
              taxClass: v.taxClass ?? product.taxClass,
              weight: { ...(v.weight ?? product.weight) },
              catalogPrice: v.basePrice!,
              ...option(v.id),
            }))
        : product.basePrice === undefined
          ? []
          : [
              {
                label: "",
                sku: product.sku,
                available: true,
                stock: { ...product.stock },
                taxClass: product.taxClass,
                weight: { ...product.weight },
                catalogPrice: product.basePrice,
                ...option(),
              },
            ];
    if (!options.length) return null;
    return {
      productId: product.id,
      name: product.name,
      type: product.type,
      unitLabel: product.unitLabel,
      pricedByWeight: product.isVariableWeight,
      options,
    };
  },

  async quoteLine(customerId, productId, variationId, quantity) {
    const product = mockProducts.find((p) => p.id === productId && p.status !== "archived");
    const customer = mockCustomers.find((c) => c.id === customerId && c.status === "approved");
    if (!product || !customer || !Number.isInteger(quantity) || quantity < 1) return null;
    const price = quotePrice(product, customer, variationId, quantity);
    if (!price) return null;
    const limits = quantityLimitsFor(product, variationId);
    return {
      unitPrice: price.unitPrice,
      basePrice: price.basePrice,
      salePrice: price.salePrice,
      rulePrice: price.rulePrice,
      priceSource: price.priceSource,
      ruleName: price.rule?.name,
      tierLabel: price.tier && tierLabel(price.tier),
      minQuantity: limits.min,
      maxQuantity: limits.max,
      quantityError: checkQuantity(limits, quantity),
    };
  },

  async create(input, actor) {
    const errors = validateCreateOrder(input);
    const customer = mockCustomers.find((c) => c.id === input.customerId);
    if (input.customerId && !customer) errors.customerId = "Customer not found.";
    else if (customer && customer.status !== "approved") errors.customerId = "Orders can only be created for approved customers.";

    input.items.forEach((line, i) => {
      const product = mockProducts.find((p) => p.id === line.productId);
      if (!product || product.status === "archived") {
        errors[`items.${i}.productId`] = "This product is not available.";
        return;
      }
      if (!errors[`items.${i}.quantity`]) {
        const limitError = checkQuantity(quantityLimitsFor(product, line.variationId), line.quantity);
        if (limitError) errors[`items.${i}.quantity`] = limitError;
      }
      if (product.type === "variable") {
        const variation = product.variations.find((v) => v.id === line.variationId);
        if (!variation) errors[`items.${i}.variationId`] = "Choose an option for this product.";
        else if (variation.status !== "active") errors[`items.${i}.variationId`] = "This option is disabled.";
      }
    });
    // Shipping: the server re-quotes from the delivery address and lines. "Suggested" must match it;
    // "manual" keeps the agreed amount with a reason. Either way the decision is stored with the order.
    const shippingQuote = Object.keys(errors).length
      ? undefined
      : (await mockShippingRepository.quote({
          address: input.shippingAddress,
          items: input.items.map((l) => ({ productId: l.productId, variationId: l.variationId, quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })),
        })).quote;
    const suggested = shippingQuote?.selected;
    if (shippingQuote && input.shipping.mode === "suggested") {
      if (!suggested) errors["shipping.amount"] = "No shipping rule applies to this address and cart — enter an agreed charge.";
      else if (suggested.cost !== input.shipping.amount)
        errors["shipping.amount"] = `The suggested charge is now ${formatMoney(suggested.cost!)} (${suggested.method.name}). Review the shipping charge.`;
    }
    if (Object.keys(errors).length || !customer) return { ok: false, errors, message: "Some fields need attention." };
    const decision = {
      mode: input.shipping.mode,
      suggestedAmount: suggested?.cost,
      zoneId: shippingQuote?.match.zone?.id,
      zoneName: shippingQuote?.match.zone?.name,
      methodId: suggested?.method.id,
      methodName: suggested?.method.name,
      reason: input.shipping.mode === "manual" ? input.shipping.reason?.trim() : undefined,
    };

    const taxSnapshot = await mockTaxRepository.snapshotFor(input.shippingAddress);
    const seq = nextNumber();
    const orderId = `ord-${seq}`;
    const at = now();
    const order = recalculate(
      {
        id: orderId,
        number: `ORD-${seq}`,
        customerId: customer.id,
        customerName: customer.companyName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        status: "received" as const,
        statusHistory: [{ id: "e1", status: "received" as const, at, by: actor, note: "Created by admin on behalf of the customer" }],
        paymentStatus: input.paymentMethod === "invoice" ? ("invoiced" as const) : ("unpaid" as const),
        payment: { method: input.paymentMethod },
        // Snapshots: name, SKU, options, weight, tax class come from the catalog now; the price is the agreed one.
        items: input.items.map((line, i) => {
          const product = mockProducts.find((p) => p.id === line.productId)!;
          const quote = quotePrice(product, customer, line.variationId, line.quantity);
          return {
            ...snapshotItem(`${orderId}-${i + 1}`, line.productId, line.variationId, line.quantity, line.unitPrice),
            discount: line.discount,
            // Which rule priced the line at order time; editing the rule later never changes this.
            pricing: quote ? pricingSnapshot(quote, line.unitPrice) : undefined,
          };
        }),
        billingAddress: toAddress(input.billingAddress, "billing", "Billing"),
        shippingAddress: toAddress(input.shippingAddress, "shipping", "Delivery"),
        shipping: { label: input.shipping.label.trim(), amount: input.shipping.amount, taxClass: SHIPPING_TAX_CLASS, deliveryRouteId: customer.deliveryRouteId, decision },
        refunds: [],
        notes: input.adminNote?.trim() ? [{ id: "n1", type: "admin" as const, body: input.adminNote.trim(), at, by: actor }] : [],
        adjustments: [],
        customerNote: input.customerNote?.trim() || undefined,
        requestedDeliveryDate: input.requestedDeliveryDate ? `${input.requestedDeliveryDate}T00:00:00+06:00` : undefined,
        // Tax settings + rates for the delivery address, frozen: later rate edits never change this order.
        taxSnapshot,
        createdVia: "admin" as const,
        createdBy: actor,
        placedAt: at,
        updatedAt: at,
      },
      mockTaxRates,
    );
    return store(order);
  },

  async updateStatus(orderId, status, actor, note) {
    const order = mockOrders.find((o) => o.id === orderId);
    if (!order) return notFound;
    if (!canTransition(order.status, status)) {
      return { ok: false, errors: { status: `Can't move from “${orderStatusLabels[order.status]}” to “${orderStatusLabels[status]}”.` } };
    }
    const reason = note?.trim();
    if (status === "cancelled" && (!reason || reason.length < 5)) return { ok: false, errors: { note: "Give a reason for cancelling (at least 5 characters)." } };
    const at = now();
    return store({
      ...order,
      status,
      statusHistory: [...order.statusHistory, { id: id("evt"), status, at, by: actor, note: reason || undefined }],
      updatedAt: at,
    });
  },

  async addNote(orderId, note, actor) {
    const order = mockOrders.find((o) => o.id === orderId);
    if (!order) return notFound;
    const body = note.body.trim();
    if (!body) return { ok: false, errors: { body: "Write a note." } };
    if (body.length > ORDER_LIMITS.note) return { ok: false, errors: { body: `Keep notes under ${ORDER_LIMITS.note} characters.` } };
    const at = now();
    return store({ ...order, notes: [...order.notes, { id: id("note"), type: note.type, body, at, by: actor }], updatedAt: at });
  },

  async adjustItem(orderId, input, actor) {
    const order = mockOrders.find((o) => o.id === orderId);
    if (!order) return notFound;
    if (!canAdjust(order.status)) return { ok: false, errors: {}, message: "Cancelled orders can't be adjusted." };
    const index = order.items.findIndex((i) => i.id === input.itemId);
    const item = order.items[index];
    if (!item) return { ok: false, errors: {}, message: "Order item not found." };
    const errors = validateAdjustment(input, item);
    if (Object.keys(errors).length) return { ok: false, errors, message: "Some fields need attention." };

    const change = { unitPrice: input.unitPrice, fulfilledWeight: input.fulfilledWeight };
    const p = previewOrderAdjustment(order, index, change, mockTaxRates);
    const updatedItem = { ...item, unitPrice: input.unitPrice ?? item.unitPrice, fulfilledWeight: input.fulfilledWeight ?? item.fulfilledWeight };
    const at = now();
    const adjusted = recalculate(
      {
        ...order,
        items: order.items.map((it, i) => (i === index ? updatedItem : it)),
        adjustments: [
          ...order.adjustments,
          {
            id: id("adj"),
            orderItemId: item.id,
            itemName: item.name,
            reason: input.reason.trim(),
            at,
            by: actor,
            before: { unitPrice: item.unitPrice, fulfilledWeight: item.fulfilledWeight, lineTotal: p.lineBefore.total, orderTotal: p.totalBefore },
            after: { unitPrice: updatedItem.unitPrice, fulfilledWeight: updatedItem.fulfilledWeight, lineTotal: p.lineAfter.total, orderTotal: p.totalAfter },
          },
        ],
        updatedAt: at,
      },
      mockTaxRates,
    );
    return store(adjusted);
  },
};
