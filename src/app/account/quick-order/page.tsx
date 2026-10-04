import type { Metadata } from "next";
import { PlannedFeatures } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Quick order" };

export default function QuickOrderPage() {
  return (
    <>
      <PageHeader
        title="Quick order"
        description="Reorder your regular items fast by SKU or from previous orders."
      />
      <PlannedFeatures
        items={[
          "Enter SKUs and quantities in a compact list",
          "Reorder items from a previous order",
          "Customer-specific prices and quantity rules shown per line",
          "Add all lines to the cart in one step",
        ]}
      />
    </>
  );
}
