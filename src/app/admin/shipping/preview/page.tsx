import type { Metadata } from "next";
import { ShippingNav, ShippingRules } from "@/components/admin/shipping/shipping-nav";
import { ShippingPreview, type PreviewExample } from "@/components/admin/shipping/shipping-preview";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { repositories } from "@/lib/data";

export const metadata: Metadata = { title: "Shipping rate preview" };

export default async function ShippingPreviewPage() {
  const [classes, rice, chicken, juice, cumin] = await Promise.all([
    repositories.catalogSettings.shippingClasses(),
    repositories.pricing.productOption("p-001"),
    repositories.pricing.productOption("p-005"),
    repositories.pricing.productOption("p-013"),
    repositories.pricing.productOption("p-011"),
  ]);
  const ex = (label: string, address: PreviewExample["address"], lines: (PreviewExample["lines"][number] | null)[]): PreviewExample | null =>
    lines.every(Boolean) ? { label, address, lines: lines as PreviewExample["lines"] } : null;
  const examples = [
    ex("Dhaka city: frozen chicken × 5 + basmati 20 kg × 2 (class surcharges)", { division: "Dhaka", district: "Dhaka", postalCode: "1212" }, [
      chicken && { product: chicken, quantity: 5 },
      rice && { product: rice, variationId: "p-001-20", quantity: 2 },
    ]),
    ex("Uttara postcode zone beats the Dhaka district zone", { division: "Dhaka", district: "Dhaka", postalCode: "1230" }, [cumin && { product: cumin, quantity: 4 }]),
    ex("Gazipur by weight: basmati 20 kg × 3 (variation weight overrides product)", { division: "Dhaka", district: "Gazipur", postalCode: "" }, [
      rice && { product: rice, variationId: "p-001-20", quantity: 3 },
    ]),
    ex("Gazipur: same item, 5 kg option (product weight)", { division: "Dhaka", district: "Gazipur", postalCode: "" }, [rice && { product: rice, variationId: "p-001-5", quantity: 3 }]),
    ex("Chattogram by order value: mango juice × 20", { division: "Chattogram", district: "Cumilla", postalCode: "" }, [juice && { product: juice, quantity: 20 }]),
    ex("Dhaka city: free delivery over ৳15,000", { division: "Dhaka", district: "Dhaka", postalCode: "" }, [rice && { product: rice, variationId: "p-001-20", quantity: 4 }]),
    ex("Sylhet (no zone) → fallback, frozen + heavy", { division: "Sylhet", district: "Sylhet", postalCode: "3100" }, [
      chicken && { product: chicken, quantity: 2 },
      rice && { product: rice, variationId: "p-001-20", quantity: 2 },
    ]),
  ].filter((e): e is PreviewExample => e !== null);

  return (
    <>
      <PageHeader title="Shipping" description="Zones by division, district or postcode, and the delivery rates for each." />
      <ShippingNav current="preview" />
      <div className="mb-6 space-y-3">
        <Notice tone="warning" title="Demo calculation">
          Uses the sample zones and rates. Nothing is booked with a courier. The backend must repeat this calculation at cart, checkout and order creation.
        </Notice>
        <ShippingRules />
      </div>
      <ShippingPreview classes={classes} examples={examples} />
    </>
  );
}
