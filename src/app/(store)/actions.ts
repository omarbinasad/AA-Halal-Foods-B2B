"use server";

import { loadQuickOrder, type QuickOrderResult } from "@/lib/storefront/quick-order";

/** Quick order search / category filter / pagination. Prices only for approved customers (decided server-side). */
export async function quickOrderAction(input: { q?: unknown; category?: unknown; page?: unknown }): Promise<QuickOrderResult> {
  const q = typeof input.q === "string" ? input.q.slice(0, 100) : undefined;
  const category = typeof input.category === "string" ? input.category.slice(0, 100) : undefined;
  const page = typeof input.page === "number" && Number.isFinite(input.page) ? input.page : 1;
  return loadQuickOrder({ q, category, page });
}
