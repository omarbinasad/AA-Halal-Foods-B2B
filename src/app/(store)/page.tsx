import { DeliveryLookup, type DivisionDelivery } from "@/components/storefront/delivery-lookup";
import {
  ArrowLink,
  Benefits,
  BusinessSection,
  CategoryGrid,
  ContactStrip,
  DeliverySection,
  Hero,
  Journal,
  SectionHeading,
  Steps,
  wrap,
} from "@/components/storefront/home-sections";
import { QuickOrder } from "@/components/storefront/quick-order";
import { repositories } from "@/lib/data";
import { BD_DIVISIONS } from "@/lib/locations";
import { getHomeCategories } from "@/lib/storefront/home";
import { loadQuickOrder } from "@/lib/storefront/quick-order";
import type { DeliveryRoute } from "@/lib/types";

const DAY: Record<string, string> = { sat: "Sat", sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri" };

/** Division → the existing delivery route that lists it (sample route data). */
function divisionRoutes(routes: DeliveryRoute[]): DivisionDelivery[] {
  return BD_DIVISIONS.map((division) => {
    const r = routes.find((x) => x.active && x.areas.some((a) => a.toLowerCase() === division.toLowerCase()));
    return { division, route: r && { name: r.name, days: r.deliveryDays.map((d) => DAY[d] ?? d).join(", "), cutoff: r.cutoffTime } };
  });
}

export default async function HomePage() {
  const [featured, quickOrder, routes] = await Promise.all([
    // Featured top-level categories (the imported sample catalog; see homeContent.featuredCategories).
    getHomeCategories(),
    // Resolved per request for the current viewer: prices only for approved customers.
    loadQuickOrder({}),
    repositories.delivery.listRoutes({ perPage: 48 }),
  ]);

  return (
    <div className="bg-surface">
      <Hero />
      <Benefits />
      <CategoryGrid categories={featured} />

      <section id="quick-order" aria-labelledby="quick-order-title" className={`${wrap} scroll-mt-40 pb-12`}>
        <SectionHeading id="quick-order-title" title="Restock faster with quick order" action={<ArrowLink href="/shop">View full catalog</ArrowLink>} />
        <p className="-mt-3 mb-4 text-sm text-muted">Find products by name or SKU.</p>
        <QuickOrder initial={quickOrder} categories={featured.map((c) => ({ slug: c.slug, name: c.name }))} />
      </section>

      <BusinessSection />
      <DeliverySection>
        <DeliveryLookup divisions={divisionRoutes(routes.items)} />
      </DeliverySection>
      <Steps />
      <Journal />
      <ContactStrip />
    </div>
  );
}
