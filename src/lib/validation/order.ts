/**
 * Order input validation shared by the admin forms and the mock repository.
 * The backend must enforce the same rules (plus stock, pricing and permissions).
 */
import { isValidAmount, lineAmounts, toGrams } from "@/lib/orders/calc";
import type { AdjustItemInput, CreateOrderInput, FieldErrors, OrderAddressInput, OrderItem, PaymentMethod } from "@/lib/types";

export const ORDER_LIMITS = { maxQuantity: 10_000, note: 1000, reason: 300, lines: 100 } as const;

const PAYMENT_METHODS: PaymentMethod[] = ["cash_on_delivery", "bank_transfer", "mobile_wallet", "invoice"];

function checkAddress(errors: FieldErrors, prefix: string, a: OrderAddressInput) {
  const required: [keyof OrderAddressInput, string][] = [
    ["recipientName", "Recipient name"],
    ["phone", "Phone"],
    ["division", "Division"],
    ["district", "District"],
    ["postalCode", "Postcode"],
    ["addressLine1", "Street address"],
  ];
  for (const [key, label] of required) {
    if (!String(a[key] ?? "").trim()) errors[`${prefix}.${key}`] = `${label} is required.`;
  }
  if (a.postalCode && !/^\d{4}$/.test(a.postalCode.trim())) errors[`${prefix}.postalCode`] = "Use a 4-digit postcode.";
}

export function validateCreateOrder(input: CreateOrderInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.customerId) errors.customerId = "Choose a customer.";
  checkAddress(errors, "billingAddress", input.billingAddress);
  checkAddress(errors, "shippingAddress", input.shippingAddress);
  if (input.items.length === 0) errors.items = "Add at least one product.";
  if (input.items.length > ORDER_LIMITS.lines) errors.items = `An order can have at most ${ORDER_LIMITS.lines} lines.`;
  input.items.forEach((item, i) => {
    const p = `items.${i}.`;
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > ORDER_LIMITS.maxQuantity)
      errors[`${p}quantity`] = `Enter a whole number from 1 to ${ORDER_LIMITS.maxQuantity}.`;
    if (!isValidAmount(item.unitPrice)) errors[`${p}unitPrice`] = "Enter a valid price (0 or more, up to 2 decimals).";
    if (!isValidAmount(item.discount)) errors[`${p}discount`] = "Enter a valid discount (0 or more, up to 2 decimals).";
    else if (!errors[`${p}quantity`] && !errors[`${p}unitPrice`] && item.discount > item.unitPrice * item.quantity)
      errors[`${p}discount`] = "The discount can't exceed the line amount.";
  });
  if (!input.shipping.label.trim()) errors["shipping.label"] = "Describe the delivery (e.g. route name).";
  if (!isValidAmount(input.shipping.amount)) errors["shipping.amount"] = "Enter a valid amount (0 or more, up to 2 decimals).";
  if (input.shipping.mode !== "suggested" && input.shipping.mode !== "manual") errors["shipping.mode"] = "Choose the suggested or an agreed charge.";
  const reason = input.shipping.reason?.trim() ?? "";
  if (input.shipping.mode === "manual" && reason.length < 5) errors["shipping.reason"] = "Explain the agreed charge (at least 5 characters).";
  if (reason.length > ORDER_LIMITS.reason) errors["shipping.reason"] = `Keep it under ${ORDER_LIMITS.reason} characters.`;
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) errors.paymentMethod = "Choose a payment method.";
  if ((input.customerNote ?? "").length > ORDER_LIMITS.note) errors.customerNote = `Keep notes under ${ORDER_LIMITS.note} characters.`;
  if ((input.adminNote ?? "").length > ORDER_LIMITS.note) errors.adminNote = `Keep notes under ${ORDER_LIMITS.note} characters.`;
  if (input.requestedDeliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.requestedDeliveryDate)) errors.requestedDeliveryDate = "Choose a valid date.";
  return errors;
}

/** Validates an item adjustment against the current item. */
export function validateAdjustment(input: AdjustItemInput, item: Pick<OrderItem, "unitPrice" | "fulfilledWeight" | "orderedWeight" | "quantity" | "discount" | "pricedByWeight">): FieldErrors {
  const errors: FieldErrors = {};
  const reason = input.reason.trim();
  if (reason.length < 5) errors.reason = "Explain the change (at least 5 characters) — it is kept in the audit history.";
  else if (reason.length > ORDER_LIMITS.reason) errors.reason = `Keep the reason under ${ORDER_LIMITS.reason} characters.`;
  if (input.unitPrice !== undefined && !isValidAmount(input.unitPrice)) errors.unitPrice = "Enter a valid price (0 or more, up to 2 decimals).";
  if (input.fulfilledWeight !== undefined && !(Number.isFinite(input.fulfilledWeight.value) && input.fulfilledWeight.value > 0))
    errors.fulfilledWeight = "Enter a weight greater than 0.";

  const priceChanged = input.unitPrice !== undefined && !errors.unitPrice && input.unitPrice !== item.unitPrice;
  const currentWeight = item.fulfilledWeight ?? item.orderedWeight;
  const weightChanged = input.fulfilledWeight !== undefined && !errors.fulfilledWeight && toGrams(input.fulfilledWeight) !== toGrams(currentWeight);
  if (!errors.unitPrice && !errors.fulfilledWeight && !priceChanged && !weightChanged) errors.unitPrice = "Change the unit price and/or the fulfilled weight.";
  if (priceChanged && !errors.unitPrice) {
    const line = lineAmounts({ ...item, unitPrice: input.unitPrice!, fulfilledWeight: input.fulfilledWeight ?? item.fulfilledWeight });
    if (item.discount > line.subtotal) errors.unitPrice = "The line discount would exceed the new line amount.";
  }
  return errors;
}
