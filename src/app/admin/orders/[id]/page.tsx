import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionNotice, DemoEditingNotice } from "@/components/admin/demo-notice";
import { AddOrderNote } from "@/components/admin/orders/add-note";
import { AdjustItemButton } from "@/components/admin/orders/adjust-item";
import { OrderStatusControls } from "@/components/admin/orders/status-controls";
import { AddressBlock, OrderItemsTable, OrderTotalsList, StatusHistoryList, StatusProgress } from "@/components/order/order-details";
import { Badge, OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Table } from "@/components/ui/table";
import { repositories } from "@/lib/data";
import { formatDate, formatDateTime, formatMoney, formatWeight } from "@/lib/format";
import { canAdjust, paymentMethodLabels } from "@/lib/orders/status";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[id]">): Promise<Metadata> {
  const order = await repositories.orders.getById((await params).id);
  return { title: order ? `Order ${order.number}` : "Order not found" };
}

export default async function AdminOrderPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [order, settings] = await Promise.all([repositories.orders.getById(id), repositories.orders.calculationSettings()]);
  if (!order) notFound();

  const adjustable = canAdjust(order.status);
  const forPreview = { items: order.items, shipping: order.shipping, refunds: order.refunds, taxSnapshot: order.taxSnapshot };
  const notice = typeof sp.notice === "string" ? sp.notice : undefined;

  return (
    <>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-foreground">← All orders</Link>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.placedAt)} · ${order.createdVia === "admin" ? `created by ${order.createdBy?.name ?? "an admin"}` : "placed in the store"}${order.legacyWooId ? ` · legacy #${order.legacyWooId}` : ""}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </>
        }
      />
      <ActionNotice notice={notice} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Card title="Delivery progress">
            <StatusProgress order={order} />
            <div className="mt-4">
              <OrderStatusControls orderId={order.id} status={order.status} />
            </div>
          </Card>

          <Card
            title="Items"
            description={adjustable ? "Use Adjust for packed weights or agreed prices on this order. Catalog prices are not changed." : undefined}
          >
            <OrderItemsTable
              items={order.items}
              showPricing
              renderAction={
                adjustable
                  ? (item, index) => <AdjustItemButton orderId={order.id} item={item} index={index} order={forPreview} taxRates={settings.taxRates} />
                  : undefined
              }
            />
            <div className="mt-4 sm:ml-auto sm:max-w-sm">
              <OrderTotalsList
                order={order}
                vatNote={
                  order.taxSnapshot
                    ? `Tax from this order's snapshot (${order.taxSnapshot.enabled ? (order.taxSnapshot.pricesIncludeTax ? "prices include tax" : "tax added to prices") : "tax was off"}; shipping ${order.taxSnapshot.shippingTaxable ? "taxable" : "not taxed"}), captured ${formatDateTime(order.taxSnapshot.capturedAt)}. Fictional demo rates; editing rates never changes this order.`
                    : "Older order: VAT uses the placeholder per-class rates it was created with."
                }
              />
            </div>
          </Card>

          <Card title="Adjustment history" description="Order-level changes to agreed prices and fulfilled weights.">
            {order.adjustments.length ? (
              <Table caption="Adjustment history" density="compact">
                <thead>
                  <tr>
                    <th scope="col">When / who</th>
                    <th scope="col">Item</th>
                    <th scope="col">Unit price</th>
                    <th scope="col">Fulfilled weight</th>
                    <th scope="col" className="text-right">Line total</th>
                    <th scope="col" className="text-right">Order total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...order.adjustments].reverse().map((a) => (
                    <tr key={a.id}>
                      <td className="whitespace-nowrap">
                        {formatDateTime(a.at)}
                        <span className="block text-xs text-muted">{a.by.name}</span>
                      </td>
                      <td className="min-w-40">
                        {a.itemName}
                        <span className="block text-xs text-muted">“{a.reason}”</span>
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {a.before.unitPrice === a.after.unitPrice ? formatMoney(a.after.unitPrice) : `${formatMoney(a.before.unitPrice)} → ${formatMoney(a.after.unitPrice)}`}
                      </td>
                      <td className="whitespace-nowrap">
                        {a.before.fulfilledWeight ? formatWeight(a.before.fulfilledWeight) : "—"} → {a.after.fulfilledWeight ? formatWeight(a.after.fulfilledWeight) : "—"}
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">{formatMoney(a.before.lineTotal)} → {formatMoney(a.after.lineTotal)}</td>
                      <td className="text-right whitespace-nowrap tabular-nums">{formatMoney(a.before.orderTotal)} → {formatMoney(a.after.orderTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p className="text-sm text-muted">No adjustments.</p>
            )}
          </Card>

          <Card title="Notes">
            {order.customerNote && (
              <div className="mb-4 rounded-ui bg-surface-muted p-3 text-sm">
                <p className="text-xs font-medium text-muted">Customer&apos;s order note</p>
                <p className="mt-1">{order.customerNote}</p>
              </div>
            )}
            {order.notes.length > 0 && (
              <ul className="mb-5 space-y-3">
                {[...order.notes].reverse().map((n) => (
                  <li key={n.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={n.type === "customer" ? "info" : "neutral"}>{n.type === "customer" ? "Visible to customer" : "Internal"}</Badge>
                      <span className="text-xs text-muted">{formatDateTime(n.at)} · {n.by.name}</span>
                    </div>
                    <p className="mt-1">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
            <AddOrderNote orderId={order.id} />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Customer">
            <p className="font-medium">
              <Link href={`/admin/customers?q=${encodeURIComponent(order.customerName)}`} className="text-brand hover:underline">{order.customerName}</Link>
            </p>
            {order.customerEmail && <p className="text-sm break-all">{order.customerEmail}</p>}
            {order.customerPhone && <p className="text-sm text-muted">{order.customerPhone}</p>}
          </Card>

          <Card title="Shipping address">
            <AddressBlock address={order.shippingAddress} />
            <p className="mt-3 text-sm text-muted">
              {order.shipping.label}
              {order.requestedDeliveryDate && <span className="block">Requested for {formatDate(order.requestedDeliveryDate)}</span>}
            </p>
            {order.shipping.decision && (
              <p className="mt-2 text-xs text-muted">
                {order.shipping.decision.mode === "suggested"
                  ? `Suggested charge used (${order.shipping.decision.methodName ?? "rule"}, zone “${order.shipping.decision.zoneName ?? "—"}”).`
                  : `Agreed charge: “${order.shipping.decision.reason ?? ""}”.${order.shipping.decision.suggestedAmount !== undefined ? ` Suggested was ${formatMoney(order.shipping.decision.suggestedAmount)}${order.shipping.decision.zoneName ? ` (zone “${order.shipping.decision.zoneName}”)` : ""}.` : " No suggestion was available."}`}{" "}
                Saved amount {formatMoney(order.shipping.amount)} — not recalculated when shipping rules change.
              </p>
            )}
          </Card>

          <Card title="Billing address">
            <AddressBlock address={order.billingAddress} />
          </Card>

          <Card title="Payment">
            <dl className="space-y-1.5 text-sm [&>div]:flex [&>div]:justify-between [&>div]:gap-4">
              <div><dt className="text-muted">Method</dt><dd>{paymentMethodLabels[order.payment.method]}</dd></div>
              <div><dt className="text-muted">Status</dt><dd><PaymentStatusBadge status={order.paymentStatus} /></dd></div>
              {order.payment.reference && <div><dt className="text-muted">Reference</dt><dd className="break-all">{order.payment.reference}</dd></div>}
              {order.payment.paidAt && <div><dt className="text-muted">Paid</dt><dd>{formatDateTime(order.payment.paidAt)}</dd></div>}
            </dl>
            {order.refunds.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="text-sm font-medium">Refunds</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  {order.refunds.map((r) => (
                    <li key={r.id}>
                      <div className="flex justify-between gap-4">
                        <span>{formatDateTime(r.at)}</span>
                        <span className="tabular-nums">−{formatMoney(r.amount)}</span>
                      </div>
                      <p className="text-xs text-muted">{r.reason} · {r.status === "processed" ? "processed" : "recorded only"} · {r.by.name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-muted">
              Read-only. Payment capture and refunds are handled by a later module — nothing here charges or refunds money.
            </p>
          </Card>

          <Card title="Status history">
            <StatusHistoryList events={order.statusHistory} />
          </Card>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {order.status === "cancelled" && (
          <Notice tone="info">This order is cancelled, so items can no longer be adjusted. Notes can still be added.</Notice>
        )}
        <DemoEditingNotice />
      </div>
    </>
  );
}
