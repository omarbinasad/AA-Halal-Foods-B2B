import type { TaxRates } from "@/lib/orders/calc";
import type { PriceResolution, QuantityLimits, RuleConflict } from "@/lib/pricing/engine";
import type { ShippingItem, ShippingQuote } from "@/lib/shipping/engine";
import type { TaxCalculation } from "@/lib/tax/engine";
import type {
  AccountStatus,
  Actor,
  AdjustItemInput,
  AdminCategoryRow,
  AdminProductRow,
  Attribute,
  AttributeValue,
  Brand,
  Category,
  CategoryInput,
  CategoryStatus,
  CreateOrderInput,
  AddressInput,
  Customer,
  CustomerDetailsInput,
  CustomerGroup,
  CustomerGroupInput,
  CustomerListItem,
  CustomerQuickInput,
  CustomerNotification,
  DashboardQuery,
  DashboardSummary,
  DeliveryRoute,
  FieldErrors,
  ID,
  Money,
  NotificationKind,
  Order,
  OrderableProduct,
  OrderLineQuote,
  OrderCustomerContext,
  PostcodeLookup,
  OrderNoteType,
  OrderStatus,
  PageQuery,
  Paginated,
  PaymentStatus,
  PriceRule,
  PriceRuleAudience,
  PriceRuleInput,
  QuantityLimitRule,
  QuantityLimitRuleInput,
  RuleStatus,
  RuleTarget,
  Product,
  ProductInput,
  ProductPick,
  ProductStatus,
  ProductType,
  ProductSummary,
  Reminder,
  ReminderChannel,
  ReminderType,
  ResolvedPrice,
  ShippingAddress,
  ShippingCartLine,
  ShippingZone,
  ShippingZoneInput,
  StoreSettings,
  OrderTaxSnapshot,
  CheckoutPaymentMethod,
  PaymentAvailability,
  PaymentMethodId,
  PaymentMethodInput,
  PaymentMethodSettings,
  TaxPreviewLineInput,
  TaxRate,
  TaxRateInput,
  TaxSettings,
  TaxSettingsInput,
  StoreSettingsInput,
  ShippingClass,
  StockStatus,
  Tag,
  TaxClass,
  TaxClassOption,
} from "@/lib/types";

/**
 * Data-access contracts used by pages. The mock implementation lives in
 * `./mock-repositories.ts`; a Laravel or Django implementation should
 * implement these same interfaces (e.g. `./api-repositories.ts`) and be
 * selected in `./index.ts` — page components should not need to change.
 *
 * All searching, filtering, sorting and pagination happen behind these
 * interfaces (server-side), never in the browser.
 */

export type SortDir = "asc" | "desc";

/** Options shared by every listing: free-text search, sort, pagination. */
export interface ListQuery<SortField extends string> extends PageQuery {
  search?: string;
  sort?: SortField;
  dir?: SortDir;
}

/** Inclusive calendar dates ("YYYY-MM-DD") in the store time zone. */
export interface DateBounds {
  from?: string;
  to?: string;
}

// --- Results ------------------------------------------------------------------

/** Outcome of a create/update. Validation failures carry field errors (API: 422 `error.fields`). */
export type SaveResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors; message?: string };

// --- Products -----------------------------------------------------------------

export type ProductSortField = "name" | "sku" | "price" | "stock" | "updated";

export interface ProductListQuery extends ListQuery<ProductSortField> {
  /** Includes products in subcategories. */
  categorySlug?: string;
  stockStatus?: StockStatus;
}

export interface AdminProductListQuery extends ProductListQuery {
  /** Omitted = published and draft (archived only when asked for). */
  status?: ProductStatus;
  type?: ProductType;
}

export interface ProductRepository {
  /** Public catalog: published + visible products only, never prices. Sortable by name or updated. */
  list(query?: ProductListQuery): Promise<Paginated<ProductSummary>>;
  getBySlug(slug: string): Promise<Product | null>;
  /** Public (active) categories. */
  listCategories(): Promise<Category[]>;

  /** Admin catalog rows, any status, with prices. */
  adminList(query?: AdminProductListQuery): Promise<Paginated<AdminProductRow>>;
  /** Admin: full product including drafts/archived and prices. */
  getById(id: ID): Promise<Product | null>;
  create(input: ProductInput): Promise<SaveResult<Product>>;
  update(id: ID, input: ProductInput): Promise<SaveResult<Product>>;
  /** Copies a product as a new draft with unique slug/SKUs. */
  duplicate(id: ID): Promise<SaveResult<Product>>;
  /** Archive (hide from the store, keep history) or restore. */
  setStatus(id: ID, status: ProductStatus): Promise<SaveResult<Product>>;
  /** Small server-side search for pickers (never the full catalog). Excludes archived products. */
  search(term: string, options?: { excludeIds?: ID[]; limit?: number }): Promise<ProductPick[]>;
  /** Picks for known IDs, in the given order (e.g. selected upsells). */
  getPicks(ids: ID[]): Promise<ProductPick[]>;
}

// --- Categories (admin) -------------------------------------------------------

export type CategorySortField = "path" | "name" | "products";

export interface CategoryListQuery extends ListQuery<CategorySortField> {
  status?: CategoryStatus;
}

export interface CategoryRepository {
  /** Every category including hidden ones (for pickers). */
  all(): Promise<Category[]>;
  list(query?: CategoryListQuery): Promise<Paginated<AdminCategoryRow>>;
  getById(id: ID): Promise<Category | null>;
  create(input: CategoryInput): Promise<SaveResult<Category>>;
  update(id: ID, input: CategoryInput): Promise<SaveResult<Category>>;
  /** Products directly in this category (not subcategories), paginated. */
  listProducts(id: ID, query?: PageQuery): Promise<Paginated<ProductPick>>;
  /** Adds/removes the category on products. Returns the number of products changed. */
  assignProducts(id: ID, change: { add?: ID[]; remove?: ID[] }): Promise<SaveResult<number>>;
}

// --- Catalog settings (taxonomies and classes used by the product form) --------

export interface CatalogSettingsRepository {
  brands(): Promise<Brand[]>;
  /** Most used first (for "most used tags" suggestions). */
  tags(): Promise<Tag[]>;
  /** Store-wide defaults shown as placeholders in the product form. */
  storeDefaults(): Promise<{ lowStockThreshold: number }>;
  createBrand(name: string): Promise<SaveResult<Brand>>;
  /** Adds a reusable value to a store-wide attribute. */
  createAttributeValue(attributeId: ID, name: string): Promise<SaveResult<AttributeValue>>;
  /** Store-wide reusable attributes with their values. */
  attributes(): Promise<Attribute[]>;
  /** Classes referenced by the future shipping-rate settings. */
  shippingClasses(): Promise<ShippingClass[]>;
  /** Classes referenced by the future tax-rate settings. */
  taxClasses(): Promise<TaxClassOption[]>;
}

// --- Pricing and quantity rules ------------------------------------------------

export type PriceRuleSortField = "name" | "audience" | "target" | "priority" | "updated";

export interface PriceRuleListQuery extends ListQuery<PriceRuleSortField> {
  audienceType?: PriceRuleAudience["type"];
  targetType?: RuleTarget["type"];
  status?: RuleStatus;
  /** true = only rules that overlap or conflict with another active rule. */
  withConflicts?: boolean;
}

/** A detected overlap with another rule, with its name for display. */
export interface RuleConflictItem extends RuleConflict {
  otherName: string;
}

/** Rule with display names and detected overlaps, so lists can search, sort and warn. */
export interface PriceRuleListItem extends PriceRule {
  audienceName: string;
  targetName: string;
  conflicts: RuleConflictItem[];
}

export type QuantityRuleSortField = "name" | "target" | "priority" | "updated";

export interface QuantityRuleListQuery extends ListQuery<QuantityRuleSortField> {
  targetType?: RuleTarget["type"];
  status?: RuleStatus;
}

export interface QuantityRuleListItem extends QuantityLimitRule {
  targetName: string;
  conflicts: RuleConflictItem[];
}

/** One purchasable option for rule pickers. */
export interface RuleProductOption {
  productId: ID;
  name: string;
  unitLabel: string;
  variations: { id: ID; label: string; sku: string; basePrice?: Money; status: string }[];
  basePrice?: Money;
}

export interface RuleTestQuery {
  customerId?: ID;
  productId: ID;
  variationId?: ID;
  quantity: number;
}

/** Everything the "Test rules" panel shows. DEMO calculation — the backend enforces the real one. */
export interface RuleTestResult {
  customer?: { id: ID; companyName: string; status: AccountStatus; groupName?: string };
  product: { id: ID; name: string; unitLabel: string; variationLabel?: string };
  /** Undefined when no customer was given (quantity limits only). */
  price?: PriceResolution;
  limits: QuantityLimits;
  quantityError?: string;
}

export interface PricingRepository {
  /** Prices for a single customer at quantity 1. Never cache publicly. */
  getCustomerPrices(customerId: ID, productIds: ID[]): Promise<ResolvedPrice[]>;
  listRules(query?: PriceRuleListQuery): Promise<Paginated<PriceRuleListItem>>;
  getRule(id: ID): Promise<PriceRuleListItem | null>;
  createRule(input: PriceRuleInput, actor: Actor): Promise<SaveResult<PriceRule>>;
  updateRule(id: ID, input: PriceRuleInput, actor: Actor): Promise<SaveResult<PriceRule>>;
  setRuleStatus(id: ID, status: RuleStatus, actor: Actor): Promise<SaveResult<PriceRule>>;
  /** Product with its variations and base prices, for rule targets and the test panel. */
  productOption(productId: ID): Promise<RuleProductOption | null>;
  /** Price + quantity limits for a customer, product option and quantity, with explanations. */
  testRules(query: RuleTestQuery): Promise<RuleTestResult | null>;
}

export interface QuantityRuleRepository {
  list(query?: QuantityRuleListQuery): Promise<Paginated<QuantityRuleListItem>>;
  get(id: ID): Promise<QuantityRuleListItem | null>;
  create(input: QuantityLimitRuleInput, actor: Actor): Promise<SaveResult<QuantityLimitRule>>;
  update(id: ID, input: QuantityLimitRuleInput, actor: Actor): Promise<SaveResult<QuantityLimitRule>>;
  setStatus(id: ID, status: RuleStatus, actor: Actor): Promise<SaveResult<QuantityLimitRule>>;
  /** Effective per-line limits for a product option (most specific rule wins). */
  effectiveFor(productId: ID, variationId?: ID): Promise<QuantityLimits | null>;
}

// --- Customers ----------------------------------------------------------------

export type CustomerSortField = "company" | "registered" | "status" | "group" | "orders" | "spend";

export interface CustomerListQuery extends ListQuery<CustomerSortField>, DateBounds {
  status?: AccountStatus;
  groupId?: ID;
  division?: string;
  /** true = has at least one non-cancelled order; false = none. */
  hasOrders?: boolean;
}

export type GroupSortField = "name" | "customers";

export interface CustomerGroupListItem extends CustomerGroup {
  customerCount: number;
}

export type NotificationSortField = "date";

export interface NotificationListQuery extends ListQuery<NotificationSortField> {
  kind?: NotificationKind;
  unreadOnly?: boolean;
}

export interface CustomerRepository {
  /** Rows include group name and order aggregates (count, spend, last order). */
  list(query?: CustomerListQuery): Promise<Paginated<CustomerListItem>>;
  getById(id: ID): Promise<Customer | null>;
  /** Customer with order aggregates, for the admin detail page. */
  getListItem(id: ID): Promise<CustomerListItem | null>;
  /** Count per approval status (for the status summary). */
  statusCounts(): Promise<Record<AccountStatus, number>>;
  /** Any status; name/contact/email/phone search, max `limit` — for pickers. */
  search(term: string, options?: { excludeGroupId?: ID; limit?: number }): Promise<Pick<Customer, "id" | "companyName" | "contactName" | "status" | "groupId">[]>;
  /** Quick add with essentials only; records the initial status in the history. */
  create(input: CustomerQuickInput, actor: Actor): Promise<SaveResult<Customer>>;
  update(id: ID, input: CustomerDetailsInput, actor: Actor): Promise<SaveResult<Customer>>;
  /** Approval workflow step; appends an AccountStatusEvent. Reason required for reject/suspend. */
  setStatus(id: ID, status: AccountStatus, reason: string | undefined, actor: Actor): Promise<SaveResult<Customer>>;
  /** Create (no id) or update an address; keeps one default per address type. */
  saveAddress(id: ID, input: AddressInput, actor: Actor): Promise<SaveResult<Customer>>;
  deleteAddress(id: ID, addressId: ID, actor: Actor): Promise<SaveResult<Customer>>;
  /** All groups, e.g. for filter options. */
  listGroups(): Promise<CustomerGroup[]>;
  /** Groups as a searchable, sortable listing with member counts. */
  listGroupSummaries(query?: ListQuery<GroupSortField>): Promise<Paginated<CustomerGroupListItem>>;
  getGroup(id: ID): Promise<CustomerGroupListItem | null>;
  createGroup(input: CustomerGroupInput, actor: Actor): Promise<SaveResult<CustomerGroup>>;
  /** Rename / describe. The id never changes, so future price and quantity rules keep pointing at it. */
  updateGroup(id: ID, input: CustomerGroupInput, actor: Actor): Promise<SaveResult<CustomerGroup>>;
  /** Adds customers to (moving them from any other group) or removes them from this group. */
  assignGroupMembers(id: ID, change: { add: ID[]; remove: ID[] }, actor: Actor): Promise<SaveResult<CustomerGroupListItem>>;
  listNotifications(customerId: ID, query?: NotificationListQuery): Promise<Paginated<CustomerNotification>>;
}

// --- Orders -------------------------------------------------------------------

export type OrderSortField = "placed" | "number" | "customer" | "total" | "status";

export interface OrderListQuery extends ListQuery<OrderSortField>, DateBounds {
  /** Scope to one customer (always set for the customer portal). */
  customerId?: ID;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryRouteId?: ID;
}

export interface OrderCalculationSettings {
  /** Placeholder VAT rates (%) per class until the tax module exists. */
  taxRates: TaxRates;
  /** Tax class applied to shipping charges. */
  shippingTaxClass: TaxClass;
}

export interface OrderRepository {
  /** `search` matches order number and customer name; dates filter on placement date. */
  list(query?: OrderListQuery): Promise<Paginated<Order>>;
  /** Pass customerId to scope the lookup to that customer's own orders. */
  getById(id: ID, customerId?: ID): Promise<Order | null>;
  calculationSettings(): Promise<OrderCalculationSettings>;
  /** Approved customers matching a name/email/phone search (max `limit`), for the order form. */
  searchCustomers(term: string, limit?: number): Promise<{ id: ID; companyName: string; contactName?: string; phone?: string; email?: string }[]>;
  /** Addresses and suggested delivery charge for an approved customer; null otherwise. */
  customerContext(customerId: ID): Promise<OrderCustomerContext | null>;
  /** Purchasable options of a product with this customer's prices; null if not orderable. */
  orderableProduct(productId: ID, customerId: ID): Promise<OrderableProduct | null>;
  /** Rule price and quantity limits for one line at a quantity (prices can change with bulk tiers). */
  quoteLine(customerId: ID, productId: ID, variationId: ID | undefined, quantity: number): Promise<OrderLineQuote | null>;
  /** Admin creates an order on behalf of a customer. Item details are snapshotted from the catalog. */
  create(input: CreateOrderInput, actor: Actor): Promise<SaveResult<Order>>;
  /** Moves along received → preparing → on_the_way → delivered, or cancels (with a note). */
  updateStatus(id: ID, status: OrderStatus, actor: Actor, note?: string): Promise<SaveResult<Order>>;
  addNote(id: ID, note: { type: OrderNoteType; body: string }, actor: Actor): Promise<SaveResult<Order>>;
  /** Changes an item's fulfilled weight and/or agreed unit price, recording an audit entry. */
  adjustItem(id: ID, input: AdjustItemInput, actor: Actor): Promise<SaveResult<Order>>;
}

// --- Delivery and reminders ---------------------------------------------------

export type RouteSortField = "name" | "fee" | "cutoff";

export interface RouteListQuery extends ListQuery<RouteSortField> {
  active?: boolean;
}

export type ReminderSortField = "type" | "lastSent";

export interface ReminderListQuery extends ListQuery<ReminderSortField> {
  type?: ReminderType;
  channel?: ReminderChannel;
  active?: boolean;
}

export interface DeliveryRepository {
  listRoutes(query?: RouteListQuery): Promise<Paginated<DeliveryRoute>>;
  listReminders(query?: ReminderListQuery): Promise<Paginated<Reminder>>;
}

// --- Analytics ----------------------------------------------------------------

// --- Locations ------------------------------------------------------------------

export interface LocationRepository {
  /**
   * Postcode → division/district/area suggestions. MOCK: a small sample dataset;
   * "not_found" means "not in the data", never "invalid postcode".
   */
  lookupPostcode(postalCode: string): Promise<PostcodeLookup>;
}

// --- Store settings and shipping ------------------------------------------------------

export interface SettingsRepository {
  getStore(): Promise<StoreSettings>;
  updateStore(input: StoreSettingsInput, actor: Actor): Promise<SaveResult<StoreSettings>>;
}

export type ZoneSortField = "match" | "name";

export interface ShippingZoneListItem extends ShippingZone {
  locationSummary: string;
}

export interface ShippingQuoteInput {
  address: ShippingAddress;
  items: ShippingCartLine[];
  /** Prices lines with this customer's rule/sale price when a line has no unitPrice. */
  customerId?: ID;
}

/** A cart line resolved for shipping: weight/class from the variation when it overrides the product. */
export interface ShippingQuoteLine extends ShippingItem {
  sku: string;
  variationLabel?: string;
  weightFrom: "variation" | "product";
  priceSource: "given" | "rule" | "sale" | "regular";
}

/** DEMO calculation with sample rates; the backend must repeat it at cart, checkout and order creation. */
export interface ShippingQuoteResult {
  quote: ShippingQuote;
  lines: ShippingQuoteLine[];
  /** Lines that could not be resolved (unknown product/variation or no price). */
  skipped: string[];
}

export interface ShippingRepository {
  /** Default order is the matching order: postcode zones, then district, then division, fallback last. */
  listZones(query?: ListQuery<ZoneSortField>): Promise<Paginated<ShippingZoneListItem>>;
  getZone(id: ID): Promise<ShippingZoneListItem | null>;
  createZone(input: ShippingZoneInput, actor: Actor): Promise<SaveResult<ShippingZone>>;
  updateZone(id: ID, input: ShippingZoneInput, actor: Actor): Promise<SaveResult<ShippingZone>>;
  /** The fallback zone cannot be deleted. */
  deleteZone(id: ID, actor: Actor): Promise<SaveResult<{ id: ID }>>;
  quote(input: ShippingQuoteInput): Promise<ShippingQuoteResult>;
}

// --- Tax ------------------------------------------------------------------------------

export type TaxRateSortField = "match" | "name" | "percent";

export interface TaxRateListQuery extends ListQuery<TaxRateSortField> {
  taxClass?: TaxClass;
  enabled?: boolean;
}

export interface TaxRateListItem extends TaxRate {
  locationLabel: string;
}

/** Tax class with how many products / variation overrides use it. */
export interface TaxClassUsage extends TaxClassOption {
  products: number;
  variationOverrides: number;
  /** Has an enabled country-wide (fallback) rate. */
  hasFallback: boolean;
}

export interface TaxPreviewInput {
  address: ShippingAddress;
  customerId?: ID;
  lines: TaxPreviewLineInput[];
  /** "auto" = suggested shipping method; "none" = no shipping; otherwise a method id of the matched zone. */
  shippingMethodId?: string;
  /** Overrides the shipping amount (e.g. an agreed charge on an admin order). */
  shippingAmount?: Money;
}

export interface TaxPreviewLine {
  productId: ID;
  variationId?: ID;
  name: string;
  variationLabel?: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  priceSource: "given" | "rule" | "sale" | "regular";
  taxClass: TaxClass;
  classFrom: "variation" | "product";
  taxable: boolean;
}

/** DEMO calculation with fictional rates; the backend performs the authoritative calculation. */
export interface TaxPreviewResult {
  calc: TaxCalculation;
  lines: TaxPreviewLine[];
  shipping: { zoneName?: string; options: { id: ID; name: string; cost?: Money; available: boolean }[]; selectedId?: ID; amount: Money };
  snapshot: OrderTaxSnapshot;
  /** Per-class matching explanation for this address. */
  matches: { taxClass: TaxClass; explanation: string }[];
  skipped: string[];
}

export interface TaxRepository {
  getSettings(): Promise<TaxSettings>;
  updateSettings(input: TaxSettingsInput, actor: Actor): Promise<SaveResult<TaxSettings>>;
  classes(): Promise<TaxClassUsage[]>;
  listRates(query?: TaxRateListQuery): Promise<Paginated<TaxRateListItem>>;
  getRate(id: ID): Promise<TaxRateListItem | null>;
  createRate(input: TaxRateInput, actor: Actor): Promise<SaveResult<TaxRate>>;
  updateRate(id: ID, input: TaxRateInput, actor: Actor): Promise<SaveResult<TaxRate>>;
  deleteRate(id: ID, actor: Actor): Promise<SaveResult<{ id: ID }>>;
  /** Current settings + rates matched for an address, frozen for a new order. */
  snapshotFor(address: ShippingAddress): Promise<OrderTaxSnapshot>;
  preview(input: TaxPreviewInput): Promise<TaxPreviewResult>;
}

// --- Payment methods (settings only) ---------------------------------------------------

export interface PaymentMethodListItem extends PaymentMethodSettings {
  availability: PaymentAvailability;
}

/**
 * Payment method SETTINGS. No payment processing, card data or gateway secrets: the
 * backend owns provider credentials and only reports the connection state.
 */
export interface PaymentSettingsRepository {
  /** All methods in display order, with availability. */
  listMethods(): Promise<PaymentMethodListItem[]>;
  getMethod(id: PaymentMethodId): Promise<PaymentMethodListItem | null>;
  updateMethod(id: PaymentMethodId, input: PaymentMethodInput, actor: Actor): Promise<SaveResult<PaymentMethodSettings>>;
  /** Saves a new display order; `ids` must list every method exactly once. */
  reorderMethods(ids: PaymentMethodId[], actor: Actor): Promise<SaveResult<PaymentMethodListItem[]>>;
  /**
   * For checkout (not built yet): enabled AND available methods, in display order, with
   * customer-facing fields only. Online payment is excluded until a provider is connected.
   */
  checkoutMethods(): Promise<CheckoutPaymentMethod[]>;
}

export interface AnalyticsRepository {
  /** Admin dashboard figures for a date range, optionally compared with a second range. */
  getDashboard(query: DashboardQuery): Promise<DashboardSummary>;
}

export interface Repositories {
  products: ProductRepository;
  categories: CategoryRepository;
  catalogSettings: CatalogSettingsRepository;
  pricing: PricingRepository;
  quantityRules: QuantityRuleRepository;
  customers: CustomerRepository;
  orders: OrderRepository;
  delivery: DeliveryRepository;
  locations: LocationRepository;
  settings: SettingsRepository;
  shipping: ShippingRepository;
  tax: TaxRepository;
  payments: PaymentSettingsRepository;
  analytics: AnalyticsRepository;
}
