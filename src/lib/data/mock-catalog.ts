import "server-only";

import type {
  AdminCategoryRow,
  AdminProductRow,
  AttributeValue,
  Brand,
  Category,
  CategoryInput,
  FieldErrors,
  Product,
  ProductInput,
  ProductPick,
  ProductSummary,
  ProductVariation,
  StockInfo,
  StockStatus,
} from "@/lib/types";
import { slugify, validateCategory, validateProduct } from "@/lib/validation/product";
import {
  mockAttributes,
  mockBrands,
  mockCategories,
  mockProducts,
  mockShippingClasses,
  mockTags,
  mockTaxClasses,
} from "./mock/catalog";
import { matches, paginate, sortBy, type SortKey } from "./mock-utils";
import type { CatalogSettingsRepository, CategoryRepository, ProductListQuery, ProductRepository, SaveResult } from "./repositories";

/*
 * DEMO STORE: edits mutate the in-memory mock arrays (on globalThis). They survive
 * page refreshes and navigation, but are lost when the server restarts, and are
 * shared by everyone using this server. The real backend persists, validates
 * uniqueness and owns stock rules (e.g. the default low-stock threshold).
 */

/** Store default; a backend setting in the real system. */
const DEFAULT_LOW_STOCK_THRESHOLD = 12;
const stockRank: Record<StockStatus, number> = { out_of_stock: 0, low_stock: 1, backorder: 2, in_stock: 3 };

const now = () => new Date().toISOString();
const clone = <T>(value: T): T => structuredClone(value);

// --- Categories helpers ---------------------------------------------------------

/** The category and all of its descendants. */
function subtreeIds(id: string): string[] {
  const children = mockCategories.filter((c) => c.parentId === id);
  return [id, ...children.flatMap((c) => subtreeIds(c.id))];
}

function categoryPath(c: Category): { path: string; depth: number } {
  const names = [c.name];
  let parent = mockCategories.find((p) => p.id === c.parentId);
  while (parent && names.length < 10) {
    names.unshift(parent.name);
    parent = mockCategories.find((p) => p.id === parent!.parentId);
  }
  return { path: names.join(" › "), depth: names.length - 1 };
}

// --- Product helpers ------------------------------------------------------------

/** Tracked stock → derived status (mock rule); untracked → the chosen status. */
function stockFrom(manage: boolean, qty: number | undefined, status: StockStatus, threshold?: number): StockInfo {
  if (!manage) return { status };
  const q = qty ?? 0;
  const low = threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
  return { quantity: q, status: q <= 0 ? "out_of_stock" : q <= low ? "low_stock" : "in_stock" };
}

/** Variable product stock = best status across active variations; quantity summed when all are counted. */
function aggregateStock(parent: StockInfo, variations: ProductVariation[]): StockInfo {
  const active = variations.filter((v) => v.status === "active");
  if (active.length === 0) return { status: "out_of_stock" };
  const status = active.map((v) => v.stock.status).sort((a, b) => stockRank[b] - stockRank[a])[0];
  // A total only makes sense when every active variation is counted (own quantity or the shared parent stock).
  if (active.some((v) => v.stockMode === "status")) return { status };
  const own = active.filter((v) => v.stockMode === "track").reduce((s, v) => s + (v.stock.quantity ?? 0), 0);
  const shared = active.some((v) => v.stockMode === "parent") ? (parent.quantity ?? 0) : 0;
  return { status, quantity: own + shared };
}

function priceRange(p: Product): AdminProductRow["price"] {
  if (p.type === "simple") return p.basePrice === undefined ? undefined : { min: p.basePrice, max: p.basePrice };
  const prices = p.variations.filter((v) => v.status === "active" && v.basePrice !== undefined).map((v) => v.basePrice!);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : undefined;
}

const categoryName = (id: string) => mockCategories.find((c) => c.id === id)?.name ?? id;

function toRow(p: Product): AdminProductRow {
  return {
    id: p.id,
    type: p.type,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    status: p.status,
    visibility: p.visibility,
    image: p.images[0],
    categoryNames: p.categoryIds.map(categoryName),
    price: priceRange(p),
    salePrice: p.type === "simple" ? p.salePrice : undefined,
    stock: p.stock,
    weight: p.weight,
    originCountry: p.originCountry,
    variationCount: p.variations.length,
    unpricedVariations: p.variations.filter((v) => v.status === "active" && v.basePrice === undefined).length,
    updatedAt: p.updatedAt,
  };
}

function toSummary(p: Product): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    shortDescription: p.shortDescription,
    unitLabel: p.unitLabel,
    // The public API never returns prices (see docs/backend-api.md §3).
    basePrice: undefined,
    stock: p.stock,
    weight: p.weight,
    isVariableWeight: p.isVariableWeight,
    categoryIds: p.categoryIds,
    image: p.images[0],
    hasVariations: p.variations.length > 0,
  };
}

/** Copy for public responses: import provenance (source prices) is admin-only. */
function publicProduct(p: Product): Product {
  const copy = clone(p);
  delete copy.importSource;
  for (const v of copy.variations) delete v.importSource;
  return copy;
}

const toPick = (p: Product): ProductPick => ({ id: p.id, name: p.name, sku: p.sku, type: p.type, status: p.status, image: p.images[0] });

function filterAndSort(products: Product[], q: ProductListQuery & { type?: string }, allowPriceSort: boolean) {
  const category = q.categorySlug ? mockCategories.find((c) => c.slug === q.categorySlug) : undefined;
  const categoryIds = category ? subtreeIds(category.id) : [];
  const scopeIds = q.categorySlugs
    ? new Set(mockCategories.filter((c) => q.categorySlugs!.includes(c.slug)).flatMap((c) => subtreeIds(c.id)))
    : undefined;
  const filtered = products.filter(
    (p) =>
      (!q.categorySlug || p.categoryIds.some((id) => categoryIds.includes(id))) &&
      (!scopeIds || p.categoryIds.some((id) => scopeIds.has(id))) &&
      (!q.stockStatus || p.stock.status === q.stockStatus) &&
      (!q.type || p.type === q.type) &&
      matches(q.search, p.name, p.sku, p.gtin, ...p.variations.flatMap((v) => [v.sku, v.gtin])),
  );
  const key = (p: Product): SortKey => {
    switch (q.sort) {
      case "sku": return p.sku;
      case "price": return allowPriceSort ? priceRange(p)?.min : p.name;
      case "stock": return p.stock.quantity ?? stockRank[p.stock.status] * 1000;
      case "updated": return p.updatedAt;
      default: return p.name;
    }
  };
  return sortBy(filtered, key, q.dir ?? (q.sort === "updated" ? "desc" : "asc"));
}

/** Uniqueness checks the backend must also enforce (slug, product + variation SKUs across the catalog). */
function uniquenessErrors(input: ProductInput, ignoreId?: string): FieldErrors {
  const errors: FieldErrors = {};
  const others = mockProducts.filter((p) => p.id !== ignoreId);
  const taken = new Set(others.flatMap((p) => [p.sku, ...p.variations.map((v) => v.sku)]).map((s) => s.toLowerCase()));
  if (others.some((p) => p.slug === input.slug)) errors.slug = "Another product already uses this slug.";
  if (taken.has(input.sku.trim().toLowerCase())) errors.sku = "Another product already uses this SKU.";
  if (input.type === "variable") {
    input.variations.forEach((v, i) => {
      if (taken.has(v.sku.trim().toLowerCase())) errors[`variations.${i}.sku`] = "Another product already uses this SKU.";
    });
  }
  const known = new Set(mockProducts.map((p) => p.id));
  for (const key of ["upsellIds", "crossSellIds"] as const) {
    if (input[key].some((id) => !known.has(id))) errors[key] = "One of the linked products no longer exists.";
  }
  if (input.brandIds.some((id) => !mockBrands.some((b) => b.id === id))) errors.brandIds = "Choose existing brands.";
  if (input.shippingClassId && !mockShippingClasses.some((c) => c.id === input.shippingClassId)) errors.shippingClassId = "Choose an existing shipping class.";
  return errors;
}

/** Tag names → IDs; unknown names create tags (as the backend would). */
function resolveTags(names: string[]): string[] {
  return [...new Set(names.map((n) => n.trim()).filter(Boolean))].map((name) => {
    const existing = mockTags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const slug = slugify(name) || "tag";
    const tag = { id: uniqueValue(`tag-${slug}`, (v) => mockTags.some((t) => t.id === v), "-"), slug, name };
    mockTags.push(tag);
    return tag.id;
  });
}

function nextProductId() {
  const max = Math.max(0, ...mockProducts.map((p) => Number(p.id.replace(/\D/g, "")) || 0));
  return `p-${String(max + 1).padStart(3, "0")}`;
}

function buildProduct(id: string, input: ProductInput, existing?: Product): Product {
  const parentStock = stockFrom(input.manageStock, input.stockQuantity, input.stockStatus, input.lowStockThreshold);
  const base: Omit<Product, "type" | "basePrice" | "salePrice" | "saleFrom" | "saleTo" | "stock" | "attributes" | "defaultAttributes" | "variations"> = {
    id,
    legacyWooId: existing?.legacyWooId,
    // Import provenance (source prices/units) is kept; the form never edits it.
    importSource: existing?.importSource,
    slug: input.slug.trim(),
    sku: input.sku.trim(),
    gtin: input.gtin?.trim() || undefined,
    name: input.name.trim(),
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    status: input.status,
    visibility: input.visibility,
    featured: input.featured,
    categoryIds: [...new Set(input.categoryIds)],
    tagIds: resolveTags(input.tags),
    brandIds: [...new Set(input.brandIds)],
    images: input.images,
    originCountry: input.originCountry || undefined,
    unitLabel: input.unitLabel.trim(),
    taxStatus: input.taxStatus,
    taxClass: input.taxClass,
    manageStock: input.manageStock,
    backorders: input.backorders,
    lowStockThreshold: input.lowStockThreshold,
    soldIndividually: input.soldIndividually,
    initialStock: input.initialStock,
    unitOfMeasure: input.unitOfMeasure?.trim() || undefined,
    weight: input.weight,
    dimensions: input.dimensions,
    shippingClassId: input.shippingClassId || undefined,
    // Not edited by the product form: kept for the future Rules module.
    quantityRule: existing?.quantityRule ?? { min: 1, step: 1 },
    isVariableWeight: input.isVariableWeight,
    upsellIds: [...new Set(input.upsellIds)].filter((x) => x !== id),
    crossSellIds: [...new Set(input.crossSellIds)].filter((x) => x !== id),
    purchaseNote: input.purchaseNote?.trim() || undefined,
    menuOrder: input.menuOrder,
    reviewsEnabled: input.reviewsEnabled,
    updatedAt: now(),
  };

  if (input.type === "simple") {
    return {
      ...base,
      type: "simple",
      basePrice: input.basePrice,
      salePrice: input.salePrice,
      saleFrom: input.saleFrom,
      saleTo: input.saleTo,
      stock: parentStock,
      attributes: input.attributes.map((a) => ({ ...a, variation: false })),
      defaultAttributes: {},
      variations: [],
    };
  }

  const previous = new Map(existing?.variations.map((v) => [v.id, v]));
  const usedIds = new Set(previous.keys());
  let n = 1;
  const variations: ProductVariation[] = input.variations.map((v) => {
    let vid = v.id && previous.has(v.id) ? v.id : undefined;
    while (!vid) {
      const candidate = `${id}-v${n++}`;
      if (!usedIds.has(candidate)) {
        vid = candidate;
        usedIds.add(candidate);
      }
    }
    return {
      id: vid,
      legacyWooId: previous.get(vid)?.legacyWooId,
      quantityRule: previous.get(vid)?.quantityRule,
      importSource: previous.get(vid)?.importSource,
      sku: v.sku.trim(),
      gtin: v.gtin?.trim() || undefined,
      attributes: v.attributes,
      status: v.status,
      basePrice: v.basePrice,
      salePrice: v.salePrice,
      saleFrom: v.saleFrom,
      saleTo: v.saleTo,
      image: v.image,
      gallery: v.gallery,
      description: v.description?.trim() || undefined,
      stockMode: v.stockMode,
      stock:
        v.stockMode === "parent"
          ? parentStock
          : stockFrom(v.stockMode === "track", v.stockQuantity, v.stockStatus, input.lowStockThreshold),
      backorders: v.backorders,
      weight: v.weight,
      dimensions: v.dimensions,
      shippingClassId: v.shippingClassId,
      taxClass: v.taxClass,
    };
  });
  return {
    ...base,
    type: "variable",
    stock: aggregateStock(parentStock, variations),
    attributes: input.attributes,
    defaultAttributes: Object.fromEntries(Object.entries(input.defaultAttributes).filter(([, v]) => v)),
    variations,
  };
}

function save(input: ProductInput, id?: string): SaveResult<Product> {
  const errors = { ...validateProduct(input, id), ...uniquenessErrors(input, id) };
  if (Object.keys(errors).length) return { ok: false, errors, message: "Some fields need attention." };
  const index = id ? mockProducts.findIndex((p) => p.id === id) : -1;
  const product = buildProduct(id ?? nextProductId(), input, index >= 0 ? mockProducts[index] : undefined);
  if (index >= 0) mockProducts[index] = product;
  else mockProducts.push(product);
  return { ok: true, value: clone(product) };
}

function uniqueValue(base: string, taken: (v: string) => boolean, sep: string) {
  let candidate = base;
  for (let i = 2; taken(candidate); i++) candidate = `${base}${sep}${i}`;
  return candidate;
}

// --- Repositories ---------------------------------------------------------------

export const mockProductRepository: ProductRepository = {
  async list({ page, perPage, ...q } = {}) {
    const searching = Boolean(q.search?.trim());
    const hiddenCategoryIds = new Set(mockCategories.filter((c) => c.status === "hidden").map((c) => c.id));
    const visible = mockProducts.filter(
      (p) =>
        p.status === "published" &&
        (searching ? p.visibility === "visible" || p.visibility === "search" : p.visibility === "visible" || p.visibility === "catalog") &&
        !(p.categoryIds.length > 0 && p.categoryIds.every((id) => hiddenCategoryIds.has(id))),
    );
    return paginate(filterAndSort(visible, q, false).map(toSummary), page, perPage);
  },
  async getBySlug(slug) {
    const p = mockProducts.find((x) => x.slug === slug && x.status === "published");
    return p ? publicProduct(p) : null;
  },
  async listCategories() {
    return mockCategories.filter((c) => c.status === "active");
  },

  async adminList({ page, perPage, status, ...q } = {}) {
    const products = mockProducts.filter((p) => (status ? p.status === status : p.status !== "archived"));
    return paginate(filterAndSort(products, q, true).map(toRow), page, perPage);
  },
  async getById(id) {
    const p = mockProducts.find((x) => x.id === id);
    return p ? clone(p) : null;
  },
  async create(input) {
    return save(input);
  },
  async update(id, input) {
    if (!mockProducts.some((p) => p.id === id)) return { ok: false, errors: {}, message: "Product not found." };
    return save(input, id);
  },
  async duplicate(id) {
    const source = mockProducts.find((p) => p.id === id);
    if (!source) return { ok: false, errors: {}, message: "Product not found." };
    const skus = new Set(mockProducts.flatMap((p) => [p.sku, ...p.variations.map((v) => v.sku)]).map((s) => s.toLowerCase()));
    const newId = nextProductId();
    const copy: Product = {
      ...clone(source),
      id: newId,
      // A copy is a new record: it has no counterpart in the old store.
      legacyWooId: undefined,
      importSource: undefined,
      name: `${source.name} (copy)`,
      slug: uniqueValue(`${source.slug}-copy`, (v) => mockProducts.some((p) => p.slug === v), "-"),
      sku: uniqueValue(`${source.sku}-COPY`, (v) => skus.has(v.toLowerCase()), "-"),
      gtin: undefined,
      status: "draft",
      updatedAt: now(),
      variations: source.variations.map((v, i) => ({
        ...clone(v),
        id: `${newId}-v${i + 1}`,
        legacyWooId: undefined,
        importSource: undefined,
        gtin: undefined,
        sku: uniqueValue(`${v.sku}-COPY`, (s) => skus.has(s.toLowerCase()), "-"),
      })),
    };
    mockProducts.push(copy);
    return { ok: true, value: clone(copy) };
  },
  async setStatus(id, status) {
    const p = mockProducts.find((x) => x.id === id);
    if (!p) return { ok: false, errors: {}, message: "Product not found." };
    p.status = status;
    p.updatedAt = now();
    return { ok: true, value: clone(p) };
  },
  async search(term, { excludeIds = [], limit = 10 } = {}) {
    if (!term.trim()) return [];
    return mockProducts
      .filter((p) => p.status !== "archived" && !excludeIds.includes(p.id) && matches(term, p.name, p.sku))
      .slice(0, Math.min(limit, 20))
      .map(toPick);
  },
  async getPicks(ids) {
    return ids.flatMap((id) => {
      const p = mockProducts.find((x) => x.id === id);
      return p ? [toPick(p)] : [];
    });
  },
};

function categoryRow(c: Category): AdminCategoryRow {
  const ids = subtreeIds(c.id);
  return {
    ...c,
    ...categoryPath(c),
    productCount: mockProducts.filter((p) => p.status !== "archived" && p.categoryIds.some((id) => ids.includes(id))).length,
  };
}

function saveCategory(input: CategoryInput, id?: string): SaveResult<Category> {
  const errors = validateCategory(input, id ? subtreeIds(id) : []);
  if (mockCategories.some((c) => c.slug === input.slug && c.id !== id)) errors.slug = "Another category already uses this slug.";
  if (input.parentId && !mockCategories.some((c) => c.id === input.parentId)) errors.parentId = "Choose an existing category.";
  if (Object.keys(errors).length) return { ok: false, errors, message: "Some fields need attention." };

  const existing = mockCategories.find((c) => c.id === id);
  const category: Category = {
    id: id ?? uniqueValue(`cat-${input.slug}`, (v) => mockCategories.some((c) => c.id === v), "-"),
    legacyWooId: existing?.legacyWooId,
    name: input.name.trim(),
    slug: input.slug.trim(),
    parentId: input.parentId || undefined,
    description: input.description?.trim() || undefined,
    status: input.status,
    image: input.image,
  };
  const index = mockCategories.findIndex((c) => c.id === id);
  if (index >= 0) mockCategories[index] = category;
  else mockCategories.push(category);
  return { ok: true, value: { ...category } };
}

export const mockCategoryRepository: CategoryRepository = {
  async all() {
    return mockCategories.map((c) => ({ ...c }));
  },
  async list({ search, status, sort = "path", dir = "asc", page, perPage } = {}) {
    const rows = mockCategories
      .filter((c) => (!status || c.status === status) && matches(search, c.name, c.slug, c.description))
      .map(categoryRow);
    const key = (r: AdminCategoryRow): SortKey => (sort === "products" ? r.productCount : sort === "name" ? r.name : r.path);
    return paginate(sortBy(rows, key, dir), page, perPage);
  },
  async getById(id) {
    const c = mockCategories.find((x) => x.id === id);
    return c ? { ...c } : null;
  },
  async create(input) {
    return saveCategory(input);
  },
  async update(id, input) {
    if (!mockCategories.some((c) => c.id === id)) return { ok: false, errors: {}, message: "Category not found." };
    return saveCategory(input, id);
  },
  async listProducts(id, { page, perPage = 20 } = {}) {
    const products = sortBy(mockProducts.filter((p) => p.categoryIds.includes(id)), (p) => p.name);
    return paginate(products.map(toPick), page, perPage);
  },
  async assignProducts(id, { add = [], remove = [] }) {
    if (!mockCategories.some((c) => c.id === id)) return { ok: false, errors: {}, message: "Category not found." };
    let changed = 0;
    for (const p of mockProducts) {
      const has = p.categoryIds.includes(id);
      if (add.includes(p.id) && !has) {
        p.categoryIds = [...p.categoryIds, id];
        changed++;
      } else if (remove.includes(p.id) && has) {
        p.categoryIds = p.categoryIds.filter((c) => c !== id);
        changed++;
      } else continue;
      p.updatedAt = now();
    }
    return { ok: true, value: changed };
  },
};

const usage = (tagId: string) => mockProducts.filter((p) => p.tagIds.includes(tagId)).length;

export const mockCatalogSettingsRepository: CatalogSettingsRepository = {
  async brands() {
    return sortBy(mockBrands, (b) => b.name).map((b) => ({ ...b }));
  },
  async tags() {
    return sortBy(mockTags, (t) => -usage(t.id)).map((t) => ({ ...t }));
  },
  async storeDefaults() {
    return { lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD };
  },
  async createBrand(rawName): Promise<SaveResult<Brand>> {
    const name = rawName.trim();
    if (!name || name.length > 60) return { ok: false, errors: { name: "Enter a brand name (up to 60 characters)." } };
    if (mockBrands.some((b) => b.name.toLowerCase() === name.toLowerCase())) return { ok: false, errors: { name: "This brand already exists." } };
    const slug = slugify(name) || "brand";
    const brand = { id: uniqueValue(`brand-${slug}`, (v) => mockBrands.some((b) => b.id === v), "-"), slug, name };
    mockBrands.push(brand);
    return { ok: true, value: { ...brand } };
  },
  async createAttributeValue(attributeId, rawName): Promise<SaveResult<AttributeValue>> {
    const attribute = mockAttributes.find((a) => a.id === attributeId);
    const name = rawName.trim();
    if (!attribute) return { ok: false, errors: {}, message: "Attribute not found." };
    if (!name || name.length > 60) return { ok: false, errors: { name: "Enter a value (up to 60 characters)." } };
    if (attribute.values.some((v) => v.name.toLowerCase() === name.toLowerCase())) return { ok: false, errors: { name: `“${name}” already exists for ${attribute.name}.` } };
    const slug = slugify(name) || "value";
    const value = { id: uniqueValue(`${attribute.id}-${slug}`, (v) => attribute.values.some((x) => x.id === v), "-"), slug, name };
    attribute.values.push(value);
    return { ok: true, value: { ...value } };
  },
  async attributes() {
    return clone(mockAttributes);
  },
  async shippingClasses() {
    return mockShippingClasses.map((c) => ({ ...c }));
  },
  async taxClasses() {
    return mockTaxClasses.map((c) => ({ ...c }));
  },
};
