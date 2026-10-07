import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { canSeeWholesalePrices, getViewer } from "@/lib/auth/session";
import { repositories } from "@/lib/data";
import { stockOptions, stockStatuses } from "@/lib/enums";
import { flatParams, oneOf, param } from "@/lib/list-params";

export const metadata: Metadata = { title: "Shop" };

/** Public sort options (prices are not public, so no price sort). */
const ORDERS = {
  name: { label: "Name A–Z", sort: "name", dir: "asc" },
  "name-desc": { label: "Name Z–A", sort: "name", dir: "desc" },
  newest: { label: "Recently updated", sort: "updated", dir: "desc" },
} as const;
type OrderKey = keyof typeof ORDERS;

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const sp = await searchParams;
  const search = param(sp, "q");
  const category = param(sp, "category");
  const stock = oneOf(param(sp, "stock"), stockStatuses);
  const orderKey: OrderKey = oneOf(param(sp, "order"), Object.keys(ORDERS) as OrderKey[]) ?? "name";
  const page = Number(param(sp, "page")) || 1;

  const viewer = await getViewer();
  const [result, categories] = await Promise.all([
    repositories.products.list({
      search,
      categorySlug: category,
      stockStatus: stock,
      sort: ORDERS[orderKey].sort,
      dir: ORDERS[orderKey].dir,
      page,
      perPage: 8,
    }),
    repositories.products.listCategories(),
  ]);

  // Customer-specific prices are resolved server-side for the current page only.
  const prices =
    viewer.kind === "customer" && canSeeWholesalePrices(viewer)
      ? await repositories.pricing.getCustomerPrices(viewer.customerId, result.items.map((p) => p.id))
      : [];
  const priceFor = (id: string) => prices.find((p) => p.productId === id)?.unitPrice;

  return (
    <>
      <PageHeader title="Shop" description="Browse the wholesale catalog. Prices are shown to approved business customers." />

      <form role="search" action="/shop" className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-[1fr_12rem_10rem_11rem_auto]">
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor="q" className="sr-only">Search products</label>
          <Input id="q" name="q" type="search" placeholder="Search by name or SKU" defaultValue={search} />
        </div>
        <div>
          <label htmlFor="category" className="sr-only">Category</label>
          <Select id="category" name="category" defaultValue={category ?? ""}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="stock" className="sr-only">Availability</label>
          <Select id="stock" name="stock" defaultValue={stock ?? ""}>
            <option value="">Any availability</option>
            {stockOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="order" className="sr-only">Sort by</label>
          <Select id="order" name="order" defaultValue={orderKey}>
            {Object.entries(ORDERS).map(([key, o]) => (
              <option key={key} value={key}>{o.label}</option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      <p className="mb-3 text-sm text-muted" aria-live="polite">
        {result.total} {result.total === 1 ? "product" : "products"}
      </p>

      {result.items.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search term, category or availability." />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} price={priceFor(product.id)} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} totalPages={result.totalPages} pathname="/shop" searchParams={flatParams(sp)} />
    </>
  );
}
