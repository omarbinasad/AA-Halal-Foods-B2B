import "server-only";

import { canSeeWholesalePrices, getViewer } from "@/lib/auth/session";
import { repositories } from "@/lib/data";
import { formatWeight } from "@/lib/format";
import type { Money, ProductImage, StockInfo } from "@/lib/types";

/** Who is looking — decides what the response may contain. */
export type QuickOrderAccess = "guest" | "pending" | "approved" | "admin";

export interface QuickOrderRow {
  id: string;
  slug: string;
  name: string;
  sku: string;
  image?: ProductImage;
  packSize: string;
  stock: StockInfo;
  /** Approved customers only — never present in other viewers' responses. */
  price?: Money;
  priceNote?: string;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface QuickOrderResult {
  access: QuickOrderAccess;
  rows: QuickOrderRow[];
  page: number;
  totalPages: number;
  total: number;
}

export const QUICK_ORDER_PAGE_SIZE = 5;

/**
 * Small, paginated product list for the Home "Quick order" panel. Searches name/SKU and
 * filters by category on the server. Wholesale prices and quantity limits are resolved
 * only for approved customers; guests, applicants and admins get product data only.
 */
export async function loadQuickOrder({ q, category, page = 1 }: { q?: string; category?: string; page?: number }): Promise<QuickOrderResult> {
  const viewer = await getViewer();
  const access: QuickOrderAccess =
    viewer.kind === "admin" ? "admin" : viewer.kind === "customer" ? (canSeeWholesalePrices(viewer) ? "approved" : "pending") : "guest";

  const result = await repositories.products.list({
    search: q?.trim() || undefined,
    categorySlug: category || undefined,
    sort: "name",
    dir: "asc",
    page: Math.max(1, Math.trunc(page) || 1),
    perPage: QUICK_ORDER_PAGE_SIZE,
  });

  let rows: QuickOrderRow[] = result.items.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    image: p.image,
    packSize: `${formatWeight(p.weight)} / ${p.unitLabel}`,
    stock: p.stock,
  }));

  if (access === "approved" && viewer.kind === "customer") {
    const ids = rows.map((r) => r.id);
    const [prices, limits] = await Promise.all([
      repositories.pricing.getCustomerPrices(viewer.customerId, ids),
      Promise.all(ids.map((id) => repositories.quantityRules.effectiveFor(id))),
    ]);
    rows = rows.map((r, i) => {
      const price = prices.find((x) => x.productId === r.id);
      const hasOptions = result.items[i].hasVariations;
      return {
        ...r,
        price: hasOptions ? undefined : price?.unitPrice,
        priceNote: hasOptions ? "Price depends on the option" : price?.priceSource === "sale" ? "Sale price" : price?.appliedRuleName ? "Your price" : undefined,
        minQuantity: limits[i]?.min,
        maxQuantity: limits[i]?.max,
      };
    });
  }

  return { access, rows, page: result.page, totalPages: result.totalPages, total: result.total };
}
