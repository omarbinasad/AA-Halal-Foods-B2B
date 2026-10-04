import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PlannedFeatures } from "@/components/ui/feedback";
import { siteConfig } from "@/config/site";
import { repositories } from "@/lib/data";

export default async function HomePage() {
  const categories = await repositories.products.listCategories();

  return (
    <div className="space-y-10">
      <section className="rounded-ui bg-brand-soft px-5 py-10 sm:px-10 sm:py-14">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{siteConfig.tagline}</h1>
        <p className="mt-3 max-w-xl text-muted">
          Browse our catalog. Approved business customers see wholesale prices and can order online.
        </p>
        <ButtonLink href="/shop" size="lg" className="mt-6">
          Browse products
        </ButtonLink>
      </section>

      <section aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-lg font-semibold">
          Shop by category
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/shop?category=${c.slug}`}
                className="block h-full rounded-ui border border-line bg-surface p-4 text-sm font-medium hover:border-brand"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <PlannedFeatures
        items={[
          "Final homepage design from supplied brand references",
          "Featured products and seasonal promotions",
          "How wholesale ordering works (delivery routes, cutoff times)",
        ]}
      />
    </div>
  );
}
