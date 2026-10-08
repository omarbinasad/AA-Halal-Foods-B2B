import type { Brand, Category, Product, Tag } from "@/lib/types";
import fixture from "../fixtures/woocommerce-catalog.json";

/**
 * Catalog imported from the old WooCommerce store as development data
 * (`npm run import:woocommerce`, see docs/woocommerce-import-report.md). A saved local
 * fixture with local images — the app and builds never contact WordPress.
 * Ids are stable ("wc-<source id>"), so reruns update records instead of duplicating them.
 */
interface ImportedCatalog {
  meta: { importedAt: string; currency: string; storeCurrency: string; pricesCopied: boolean; weightUnit: string; dimensionUnit: string };
  categories: Category[];
  brands: Brand[];
  tags: Tag[];
  products: Product[];
}

const imported = fixture as unknown as ImportedCatalog;

export const importedCatalogMeta = imported.meta;
export const importedCategories = imported.categories;
export const importedBrands = imported.brands;
export const importedTags = imported.tags;
export const importedProducts = imported.products;
