/**
 * Integrity of the saved WooCommerce import fixture (src/lib/data/fixtures/woocommerce-catalog.json).
 * Run with `npm test`. Regenerate the fixture with `npm run import:woocommerce`.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sanitizeHtml } from "../src/lib/html/sanitize.ts";
import type { Brand, Category, Product, Tag } from "../src/lib/types/index.ts";

const raw = readFileSync(new URL("../src/lib/data/fixtures/woocommerce-catalog.json", import.meta.url), "utf8");
const fixture = JSON.parse(raw) as {
  meta: { currency: string; storeCurrency: string; pricesCopied: boolean; weightUnit: string; dimensionUnit: string };
  categories: Category[];
  brands: Brand[];
  tags: Tag[];
  products: Product[];
};
const { meta, categories, brands, tags, products } = fixture;
const demoSource = readFileSync(new URL("../src/lib/data/mock/catalog.ts", import.meta.url), "utf8");
const publicFile = (src: string) => new URL(`../public${src}`, import.meta.url);

const unique = (values: unknown[]) => new Set(values).size === values.length;

describe("woocommerce fixture", () => {
  it("has the expected volume and source settings", () => {
    assert.ok(products.length >= 50, `expected at least 50 products, got ${products.length}`);
    assert.ok(categories.length > 0);
    assert.equal(meta.storeCurrency, "BDT");
    assert.equal(meta.pricesCopied, meta.currency === meta.storeCurrency);
  });

  it("uses stable, unique ids, slugs, SKUs and legacy ids", () => {
    for (const list of [products, categories, brands, tags] as { id: string; legacyWooId?: number }[][]) {
      assert.ok(unique(list.map((x) => x.id)), "duplicate id");
      assert.ok(unique(list.map((x) => x.legacyWooId)), "duplicate legacy id");
      assert.ok(list.every((x) => typeof x.legacyWooId === "number"), "missing legacy id");
    }
    assert.ok(products.every((p) => p.id === `wc-${p.legacyWooId}`));
    assert.ok(categories.every((c) => c.id === `wc-cat-${c.legacyWooId}`));
    assert.ok(unique(products.map((p) => p.slug)) && unique(categories.map((c) => c.slug)));
    const skus = products.flatMap((p) => [p.sku, ...p.variations.map((v) => v.sku)]).map((s) => s.toLowerCase());
    assert.ok(unique(skus), "duplicate SKU");
    assert.ok(skus.every(Boolean), "empty SKU");
  });

  it("does not clash with the hand-written demo catalog", () => {
    const demoSlugs = new Set([...demoSource.matchAll(/\bslug: "([^"]+)"/g)].map((m) => m[1]));
    const demoSkus = new Set([...demoSource.matchAll(/\bsku: "([^"]+)"/g)].map((m) => m[1].toLowerCase()));
    assert.ok(products.every((p) => !demoSlugs.has(p.slug) && !demoSkus.has(p.sku.toLowerCase())));
    assert.ok(categories.every((c) => !demoSlugs.has(c.slug)));
    assert.ok(!/\bid: "wc-/.test(demoSource), "demo records must not use imported ids");
  });

  it("preserves the category hierarchy without cycles", () => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    for (const c of categories) {
      const seen = new Set<string>([c.id]);
      let parent = c.parentId;
      while (parent) {
        assert.ok(byId.has(parent), `${c.id} has unknown parent ${parent}`);
        assert.ok(!seen.has(parent), `cycle at ${c.id}`);
        seen.add(parent);
        parent = byId.get(parent)!.parentId;
      }
    }
    assert.ok(categories.some((c) => c.parentId), "expected nested categories");
  });

  it("links products only to imported categories, brands, tags and products", () => {
    const ids = { cat: new Set(categories.map((c) => c.id)), brand: new Set(brands.map((b) => b.id)), tag: new Set(tags.map((t) => t.id)), product: new Set(products.map((p) => p.id)) };
    for (const p of products) {
      assert.ok(p.categoryIds.length > 0, `${p.id} has no category`);
      assert.ok(p.categoryIds.every((id) => ids.cat.has(id)), `${p.id} unknown category`);
      assert.ok(p.brandIds.every((id) => ids.brand.has(id)), `${p.id} unknown brand`);
      assert.ok(p.tagIds.every((id) => ids.tag.has(id)), `${p.id} unknown tag`);
      assert.ok([...p.upsellIds, ...p.crossSellIds].every((id) => ids.product.has(id)), `${p.id} unknown linked product`);
      assert.equal(p.type === "variable", p.variations.length > 0, `${p.id} type/variations mismatch`);
    }
  });

  it("references only local images that exist on disk", () => {
    const images = [...products.flatMap((p) => [...p.images, ...p.variations.flatMap((v) => [v.image, ...v.gallery])]), ...categories.map((c) => c.image)].filter((x) => x !== undefined);
    assert.ok(images.length > 0);
    for (const img of images) {
      assert.match(img.src, /^\/images\/(products|categories)\/[a-z0-9][a-z0-9.-]*\.(webp|jpg|png|gif|avif)$/, img.src);
      assert.ok(existsSync(publicFile(img.src)), `missing file ${img.src}`);
      assert.ok(img.width > 0 && img.height > 0 && img.alt.trim(), `bad image metadata ${img.src}`);
    }
    assert.ok(!/https?:\/\//i.test(raw), "fixture must not contain remote URLs");
  });

  it("keeps source prices as metadata and never relabels them as store prices", () => {
    for (const p of products) {
      assert.equal(p.importSource?.system, "woocommerce");
      assert.equal(p.importSource?.currency, meta.currency);
      assert.equal(p.importSource?.weightUnit, meta.weightUnit);
      if (!meta.pricesCopied) {
        assert.equal(p.basePrice, undefined, `${p.id} has a store price from a ${meta.currency} source`);
        assert.equal(p.salePrice, undefined);
        assert.ok(p.variations.every((v) => v.basePrice === undefined && v.salePrice === undefined));
      }
    }
    assert.ok(products.some((p) => p.importSource?.regularPrice), "source prices should be preserved");
  });

  it("stores sanitized descriptions", () => {
    for (const p of products) assert.equal(sanitizeHtml(p.description), p.description, `${p.id} description not sanitized`);
    assert.ok(products.every((p) => !/<script|on\w+=|javascript:/i.test(p.description + p.shortDescription)));
  });

  it("contains no credentials", () => {
    assert.ok(!/consumer_(key|secret)|\bck_[0-9a-f]{20,}|\bcs_[0-9a-f]{20,}/i.test(raw));
  });
});
