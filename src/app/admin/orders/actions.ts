"use server";

/*
 * Admin order mutations and lookups. DEMO: the mock repository keeps changes in
 * server memory only; nothing is charged, refunded or sent to the customer.
 * TODO(auth): the actor and permissions come from the mock session today — the
 * backend must authenticate the admin and check permissions on every call.
 */
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminActor } from "@/lib/auth/session";
import { repositories } from "@/lib/data";
import { orderStatuses } from "@/lib/enums";
import type {
  AdjustItemInput,
  CreateOrderInput,
  FieldErrors,
  OrderableProduct,
  OrderLineQuote,
  OrderAddressInput,
  OrderCustomerContext,
  OrderNoteType,
  PaymentMethod,
  Weight,
} from "@/lib/types";

export type OrderActionResult = { ok: true } | { ok: false; errors: FieldErrors; message: string };

// --- Coercion of untrusted action arguments ---------------------------------------

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: unknown, max = 2000) => str(v, max).trim() || undefined;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number.NaN);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

const PAYMENT_METHODS = ["cash_on_delivery", "bank_transfer", "mobile_wallet", "invoice"] as const satisfies readonly PaymentMethod[];

function address(v: unknown): OrderAddressInput {
  const a = obj(v);
  return {
    recipientName: str(a.recipientName, 200),
    companyName: optStr(a.companyName, 200),
    country: "BD",
    division: str(a.division, 100),
    district: str(a.district, 100),
    area: optStr(a.area, 100),
    postalCode: str(a.postalCode, 10),
    addressLine1: str(a.addressLine1, 300),
    addressLine2: optStr(a.addressLine2, 300),
    phone: str(a.phone, 40),
  };
}

function weight(v: unknown): Weight | undefined {
  if (v === undefined || v === null) return undefined;
  const w = obj(v);
  return { value: num(w.value), unit: oneOf(w.unit, ["g", "kg"] as const, "kg") };
}

const denied = (message = "You don't have permission to do this."): OrderActionResult => ({ ok: false, errors: {}, message });

const failed = (r: { errors: FieldErrors; message?: string }, fallback: string): OrderActionResult => ({
  ok: false,
  errors: r.errors,
  message: r.message ?? Object.values(r.errors)[0] ?? fallback,
});

async function actorWith(permission: string) {
  const actor = await getAdminActor();
  return actor.permissions.includes(permission) ? { id: actor.id, name: actor.name, role: actor.role } : null;
}

function refresh(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/account/orders", "layout");
  revalidatePath("/admin");
}

// --- Lookups for the create-order form ---------------------------------------------

export async function searchOrderCustomersAction(term: string) {
  return repositories.orders.searchCustomers(str(term, 100), 10);
}

export async function getOrderCustomerAction(customerId: string): Promise<OrderCustomerContext | null> {
  return repositories.orders.customerContext(str(customerId, 100));
}

export async function getOrderableProductAction(productId: string, customerId: string): Promise<OrderableProduct | null> {
  return repositories.orders.orderableProduct(str(productId, 100), str(customerId, 100));
}

// --- Mutations ------------------------------------------------------------------------

export async function createOrderAction(raw: unknown): Promise<OrderActionResult> {
  const actor = await actorWith("orders.create");
  if (!actor) return denied();
  const v = obj(raw);
  const shipping = obj(v.shipping);
  const input: CreateOrderInput = {
    customerId: str(v.customerId, 100),
    billingAddress: address(v.billingAddress),
    shippingAddress: address(v.shippingAddress),
    items: (Array.isArray(v.items) ? v.items.slice(0, 101) : []).map((x) => {
      const i = obj(x);
      return {
        productId: str(i.productId, 100),
        variationId: optStr(i.variationId, 100),
        quantity: num(i.quantity),
        unitPrice: num(i.unitPrice),
        discount: num(i.discount),
      };
    }),
    shipping: { label: str(shipping.label, 120), amount: num(shipping.amount), mode: shipping.mode === "manual" ? "manual" : "suggested", reason: optStr(shipping.reason, 300) },
    paymentMethod: oneOf(v.paymentMethod, PAYMENT_METHODS, "cash_on_delivery"),
    customerNote: optStr(v.customerNote),
    adminNote: optStr(v.adminNote),
    requestedDeliveryDate: optStr(v.requestedDeliveryDate, 10),
  };
  const result = await repositories.orders.create(input, actor);
  if (!result.ok) return failed(result, "Some fields need attention.");
  refresh(result.value.id);
  redirect(`/admin/orders/${result.value.id}?notice=order-created` as Route);
}

export async function updateOrderStatusAction(orderId: string, status: string, note?: string): Promise<OrderActionResult> {
  const actor = await actorWith("orders.update");
  if (!actor) return denied();
  if (!orderStatuses.includes(status as (typeof orderStatuses)[number])) return denied("Unknown status.");
  const id = str(orderId, 100);
  const result = await repositories.orders.updateStatus(id, status as (typeof orderStatuses)[number], actor, optStr(note, 300));
  if (!result.ok) return failed(result, "The status could not be changed.");
  refresh(id);
  return { ok: true };
}

export async function addOrderNoteAction(orderId: string, type: string, body: string): Promise<OrderActionResult> {
  const actor = await actorWith("orders.update");
  if (!actor) return denied();
  const id = str(orderId, 100);
  const noteType = oneOf<OrderNoteType>(type, ["admin", "customer"], "admin");
  const result = await repositories.orders.addNote(id, { type: noteType, body: str(body, 1000) }, actor);
  if (!result.ok) return failed(result, "The note could not be added.");
  refresh(id);
  return { ok: true };
}

export async function adjustOrderItemAction(orderId: string, raw: unknown): Promise<OrderActionResult> {
  const actor = await actorWith("orders.adjust");
  if (!actor) return denied("You don't have permission to adjust order items.");
  const v = obj(raw);
  const input: AdjustItemInput = {
    itemId: str(v.itemId, 100),
    unitPrice: v.unitPrice === undefined ? undefined : num(v.unitPrice),
    fulfilledWeight: weight(v.fulfilledWeight),
    reason: str(v.reason, 300),
  };
  const id = str(orderId, 100);
  const result = await repositories.orders.adjustItem(id, input, actor);
  if (!result.ok) return failed(result, "The adjustment could not be saved.");
  refresh(id);
  return { ok: true };
}

/** Form action for the list's one-step "Mark as …" button; reports back via `?notice=`. */
export async function advanceOrderStatusAction(formData: FormData) {
  const raw = String(formData.get("returnTo") ?? "");
  const returnTo = raw.startsWith("/admin/orders") && !raw.startsWith("//") ? raw : "/admin/orders";
  const result = await updateOrderStatusAction(String(formData.get("id") ?? ""), String(formData.get("status") ?? ""));
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=${result.ok ? "status" : "error"}` as Route);
}

/** Rule price and quantity limits for one line (bulk tiers change the price with the quantity). DEMO calculation. */
export async function quoteOrderLineAction(customerId: string, productId: string, variationId: string | undefined, quantity: number): Promise<OrderLineQuote | null> {
  const q = typeof quantity === "number" && Number.isInteger(quantity) ? quantity : 0;
  return repositories.orders.quoteLine(str(customerId, 100), str(productId, 100), variationId ? str(variationId, 100) : undefined, q);
}

export interface OrderShippingSuggestion {
  amount?: number;
  label?: string;
  zoneName?: string;
  methodName?: string;
  totalKg: number;
  subtotal: number;
  explanation: string;
}

/** Suggested shipping for the delivery address and lines (DEMO rates; the server re-checks on save). */
export async function quoteOrderShippingAction(raw: unknown): Promise<OrderShippingSuggestion> {
  const v = obj(raw);
  const a = obj(v.address);
  const items = (Array.isArray(v.items) ? v.items.slice(0, 100) : []).map((x) => {
    const i = obj(x);
    const price = num(i.unitPrice);
    const discount = num(i.discount);
    return {
      productId: str(i.productId, 100),
      variationId: optStr(i.variationId, 100),
      quantity: num(i.quantity),
      unitPrice: Number.isFinite(price) ? price : undefined,
      discount: Number.isFinite(discount) ? discount : undefined,
    };
  });
  const { quote } = await repositories.shipping.quote({
    address: { division: str(a.division, 50), district: str(a.district, 100), postalCode: optStr(a.postalCode, 10) },
    items,
  });
  const selected = quote.selected;
  return {
    amount: selected?.cost,
    label: selected ? `${selected.method.name} — ${quote.match.zone?.name}` : undefined,
    zoneName: quote.match.zone?.name,
    methodName: selected?.method.name,
    totalKg: quote.metrics.totalGrams / 1000,
    subtotal: quote.metrics.subtotal,
    explanation: quote.explanation,
  };
}
