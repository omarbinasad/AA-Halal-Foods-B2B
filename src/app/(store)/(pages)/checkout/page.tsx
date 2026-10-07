import type { Metadata } from "next";
import { Notice, PlannedFeatures } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <>
      <PageHeader title="Checkout" description="Confirm delivery details and place your wholesale order." />
      <div className="space-y-6">
        <Notice tone="warning" title="Checkout is not available yet">
          Orders cannot be placed from this site until the ordering backend is connected. No order or payment is
          processed on this page.
        </Notice>
        <PlannedFeatures
          items={[
            "Shipping address and requested delivery date",
            "Shipping charge by delivery route",
            "VAT breakdown (rates from backend tax settings)",
            "Order submission handled by the backend",
          ]}
        />
      </div>
    </>
  );
}
