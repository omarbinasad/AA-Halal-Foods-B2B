import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddressBlock, OrderItemsTable, OrderTotalsList, StatusProgress } from "@/components/order/order-details";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getPortalCustomerId } from "@/lib/auth/session";
import { repositories } from "@/lib/data";
import { formatDate, formatDateTime } from "@/lib/format";
import { paymentMethodLabels } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Order details" };

export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  // Scoped to the current customer so one customer cannot open another's order.
  const order = await repositories.orders.getById(id, await getPortalCustomerId());
  if (!order) notFound();

  // Only customer-visible notes; internal admin notes must never reach the portal
  // (the real backend must filter these server-side as well).
  const notes = order.notes.filter((n) => n.type === "customer");

  return (
    <>
      <Link href="/account/orders" className="text-sm text-muted hover:text-foreground">← All orders</Link>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.placedAt)}`}
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </>
        }
      />

      <Card className="mb-6">
        <StatusProgress order={order} />
      </Card>

      <OrderItemsTable items={order.items} />
      {order.adjustments.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Some items were adjusted after packing (final weight or agreed price). Line totals show the final amounts.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="Delivery">
          <AddressBlock address={order.shippingAddress} />
          <p className="mt-3 text-sm text-muted">
            {order.shipping.label}
            {order.requestedDeliveryDate && ` · requested ${formatDate(order.requestedDeliveryDate)}`}
          </p>
          {order.customerNote && <p className="mt-2 text-sm">Your note: {order.customerNote}</p>}
        </Card>

        <Card title="Summary">
          <OrderTotalsList order={order} />
          <p className="mt-3 text-sm text-muted">
            Payment: {paymentMethodLabels[order.payment.method]}
            {order.payment.reference && ` · ref ${order.payment.reference}`}
          </p>
        </Card>

        {notes.length > 0 && (
          <Card title="Messages from us" className="md:col-span-2">
            <ul className="space-y-3 text-sm">
              {notes.map((n) => (
                <li key={n.id}>
                  <p>{n.body}</p>
                  <p className="text-xs text-muted">{formatDateTime(n.at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
