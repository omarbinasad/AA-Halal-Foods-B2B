import type { Metadata } from "next";
import { TaxNav, TaxRules } from "@/components/admin/tax/tax-nav";
import { TaxPreview, type TaxPreviewExample } from "@/components/admin/tax/tax-preview";
import { Notice } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { repositories } from "@/lib/data";

export const metadata: Metadata = { title: "Tax preview" };

export default async function TaxPreviewPage() {
  const [settings, rice, juice, chicken, cumin] = await Promise.all([
    repositories.tax.getSettings(),
    repositories.pricing.productOption("p-001"),
    repositories.pricing.productOption("p-013"),
    repositories.pricing.productOption("p-005"),
    repositories.pricing.productOption("p-011"),
  ]);
  const ex = (e: Omit<TaxPreviewExample, "lines"> & { lines: (TaxPreviewExample["lines"][number] | null)[] }): TaxPreviewExample | null =>
    e.lines.every(Boolean) ? { ...e, lines: e.lines as TaxPreviewExample["lines"] } : null;
  const examples = [
    ex({ label: "Dhaka: standard + reduced classes, line discount", address: { division: "Dhaka", district: "Dhaka", postalCode: "1212" }, lines: [juice && { product: juice, quantity: 10, discount: 200 }, rice && { product: rice, variationId: "p-001-5", quantity: 4 }] }),
    ex({ label: "Uttara postcode rate beats the country rate", address: { division: "Dhaka", district: "Dhaka", postalCode: "1230" }, lines: [juice && { product: juice, quantity: 5 }] }),
    ex({ label: "Gazipur district rate + taxable shipping (if enabled)", address: { division: "Dhaka", district: "Gazipur", postalCode: "" }, lines: [juice && { product: juice, quantity: 8 }, chicken && { product: chicken, quantity: 3 }] }),
    ex({ label: "Chattogram division rate", address: { division: "Chattogram", district: "Cumilla", postalCode: "" }, lines: [juice && { product: juice, quantity: 20 }, cumin && { product: cumin, quantity: 4 }] }),
    ex({ label: "Customer prices: Sample Kitchen Gulshan, basmati 20 kg × 2", customerId: "cus-001", address: { division: "Dhaka", district: "Dhaka", postalCode: "1212" }, lines: [rice && { product: rice, variationId: "p-001-20", quantity: 2 }] }),
  ].filter((e): e is TaxPreviewExample => e !== null);

  return (
    <>
      <PageHeader title="Tax" description="Preview tax for an address, customer, cart and shipping method." />
      <TaxNav current="preview" />
      <div className="mb-6 space-y-3">
        <Notice tone="warning" title="Demo calculation with fictional rates">
          Current settings: tax {settings.enabled ? "on" : "off"}, prices {settings.pricesIncludeTax ? "include" : "exclude"} tax, shipping {settings.shippingTaxable ? "taxable" : "not taxed"}. No rate shown is a legal
          rate, and nothing is filed or collected.{!settings.enabled && " Tax is off by default, so previews show no tax until you enable it under Settings & rates."}
        </Notice>
        <TaxRules />
      </div>
      <TaxPreview examples={examples} />
    </>
  );
}
