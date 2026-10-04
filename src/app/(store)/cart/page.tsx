import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PlannedFeatures } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHeader title="Cart" description="Review items before checkout. Available to approved business customers." />
      <div className="space-y-6">
        <EmptyState
          title="Your cart is empty"
          description="The cart is not connected yet. Adding products will be available once customer accounts are live."
          action={<ButtonLink href="/shop" variant="secondary">Browse products</ButtonLink>}
        />
        <PlannedFeatures
          items={[
            "Server-side cart tied to the customer account",
            "Quantity rules (minimum, step, maximum) enforced per item",
            "Estimated weight and variable-weight notes",
            "Delivery route and cutoff time preview",
          ]}
        />
      </div>
    </>
  );
}
