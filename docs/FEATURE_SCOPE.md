# Feature scope

Inventory of what the new system must cover to replace the current WordPress/WooCommerce site, and where each
feature stands in this frontend. The API contract is in [backend-api.md](backend-api.md).

Store defaults (mock, configurable in [`src/config/site.ts`](../src/config/site.ts)): Bangladesh, BDT (৳), `Asia/Dhaka`.
Product origin (e.g. Japan) is a product attribute, separate from the store location.

## Legend

**Source**
- **WC**: standard WooCommerce/WordPress behaviour.
- **Plugin?**: believed to come from a custom or third-party plugin on the current site. **Confirm against the live site.**
- **New**: a new request; does not exist on the current site.

**Frontend status**. A screen existing does not make a feature complete.
- **—**: not started.
- **Types**: modelled in `src/lib/types`, no UI.
- **Placeholder**: route exists with a "planned" note; no working behaviour.
- **Read-only demo**: shows mock data; no actions.
- **Interactive demo**: controls work against mock data; nothing is saved.
- **Done**: works end-to-end with the real backend. *Nothing is Done yet.*

**Backend**: **Yes** means real behaviour needs the backend (data, persistence, enforcement or integrations).

---

## 1. Products and inventory

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Simple and variable products, variations | WC | Interactive demo: admin form (both types, generated or manual variations, confirm for large sets, duplicate-combination check) | Yes |
| SKU, GTIN/barcode, categories, tags, brands (several per product), descriptions | WC | Interactive demo (field validation; inline "Add new category/brand"; most-used tags; new tags created on save) | Yes |
| Attributes: store-wide reusable values (+ "Create value") and product-specific values, visible / used-for-variations, order, default selection | WC | Interactive demo (store attributes are seeded; no attribute management screen yet) | Yes |
| Product images / gallery (product, plus per-variation uploaded or gallery image) | WC | Interactive demo: order, main image, alt text — local previews only, **not uploaded** | Yes (upload + media host) |
| Country of origin | New (may exist as a WC attribute; confirm) | Interactive demo (admin form, list column, product page) | Yes |
| Weight, dimensions, shipping class (product + variation overrides) | WC | Interactive demo; shipping classes reference future rate settings | Yes |
| Tax status and tax class (product + variation override) | WC | Interactive demo; classes reference future tax settings | Yes |
| Regular price | WC | Interactive demo (admin only; hidden from public API) | Yes |
| Sale price and sale dates | WC | Interactive demo (product + variation) | Yes (applying the schedule) |
| Inventory: track stock, quantity / status, backorders, low-stock threshold (store-wide default shown), sold individually | WC | Interactive demo (variations: same as product, own quantity or own status) | Yes |
| Variation bulk actions (set price/sale/stock, enable/disable all, delete all, expand/collapse) | WC | Interactive demo | Yes |
| Enabled variation without a price | WC | Warning in the editor and list; publishing blocked | Yes |
| Visibility, status (draft/published/archived), featured | WC | Interactive demo; public list respects status and visibility | Yes |
| Upsells and cross-sells | WC | Interactive demo (server-side product search picker) | Yes |
| Purchase note, display order, reviews toggle | WC | Interactive demo (stored; reviews feature itself not built) | Yes |
| Legacy WooCommerce IDs, "initial number in stock", "unit of measurement" | WC (migration) | Typed optional fields; the last two edited in Inventory (as on the old store); no logic | Yes (migration) |
| Rich-text description, scheduled publishing, private/password visibility, SEO fields, virtual/downloadable | WC / plugins | — (deferred) | Yes |
| Per-product min / max / increment | Plugin? | Min/max moved to quantity rules (§3); increment (`step`) stays a product setting | Yes |
| Product preview | New | Interactive demo (approved-customer view) | No |
| Admin add / edit / duplicate / archive products | WC | Interactive demo — in-memory mock store (survives refresh and navigation, lost on restart) | Yes |
| Category management (name, slug, parent, description, image, status) + product assignment | WC | Interactive demo — same in-memory store | Yes |
| Brand / tag / attribute / shipping-class management screens | WC | — (selectors use seeded lists) | Yes |
| Search, filter, pagination | WC | Interactive demo (shop: search, category, availability; admin: search incl. variation SKU, category tree, type, stock, status) | Yes |
| Sorting | WC | Interactive demo (shop sort select; admin column sorting) | Yes |
| Import existing products and images | New (migration) | — | Yes |

## 2. B2B accounts and permissions

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Business registration form | Plugin? | Placeholder (disabled form) | Yes |
| Optional document upload | New | — | Yes (file storage) |
| Approval / rejection / suspension | Plugin? | Interactive demo: pending → approved/rejected, suspend/reactivate, reopen; reason required to reject/suspend; audit history. No emails | Yes |
| Price hiding for guests and unapproved accounts | Plugin? | UI hint only via mock viewer | Yes (**enforcement**) |
| Admin quick-add customer (few fields, details later) | New | Interactive demo (name + phone or email + initial status; "details to complete" prompt) | Yes |
| Admin customer list / detail / edit | WC | Interactive demo (filters, order count, total spend, linked orders, multiple addresses) | Yes |
| Customer groups | Plugin? | Interactive demo: create, rename, add/remove members, member counts. Group IDs ready for future price/quantity rules; delete not built | Yes |
| Roles: administrator, shop manager, customer | WC | Mock viewer has guest / customer / admin only | Yes |
| Access and permission enforcement | — | **None**: portal and admin are open, with a preview banner | Yes |

## 3. Pricing and quantity rules

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Customer-specific and group pricing | Plugin? | Interactive demo: create, edit, enable/disable; audience = one customer, a group or all approved customers | Yes (**enforcement at cart/checkout**) |
| Fixed price, amount-off and percentage-off by customer / group / all × variation / product / category / all | Plugin? | Interactive demo; negative prices rejected | Yes |
| Bulk / tier pricing | Plugin? | Interactive demo: up to 10 non-overlapping tiers per rule with live preview | Yes |
| Product / variation min / max per line | Plugin? | Interactive demo (quantity rules); product page shows the effective limit | Yes |
| Global and category min / max per line | Plugin? | Interactive demo; applies to each product line, not the category total | Yes |
| Cart-level rules (e.g. minimum order value) | Plugin? | — | Yes |
| **Rule precedence** | — | **Decided** (docs/backend-api.md §6.1–6.2): customer > group > all; then variation > product > category > all; then priority; then older rule (flagged as conflict). One rule per line, no stacking. Rules use the regular price (fixed rules their own amount); the customer pays the lower of the rule price and the active sale price — compared, never combined. Pure engine + tests in `src/lib/pricing/engine.ts` | Yes (same rules) |
| Overlap / conflict detection | New | Interactive demo (list filter, rule page) | Yes |
| Test rules panel (customer + product + quantity → price, limits, explanation) | New | Interactive demo with examples (demo calculation) | Yes (endpoint) |
| Rule used for an order line's price | New | Snapshot on admin-created orders (`OrderItem.pricing`); unchanged when rules change | Yes |

## 4. Storefront, cart, checkout and orders

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Home | WC (theme) | Placeholder (category links) | Content later |
| Shop, product page | WC | Interactive demo | Yes |
| About, contact | WC (pages) | Placeholder | Yes (contact form) |
| Cart | WC | Placeholder | Yes |
| Checkout: addresses, shipping estimate, tax display, payment method, summary | WC | Placeholder (no submit) | Yes |
| Order confirmation | WC | — | Yes |
| Order history and details | WC | Read-only demo (portal) | Yes |
| Reorder | WC | — | Yes |
| Notifications | Plugin? / New | Read-only demo | Yes |
| Invoices | Plugin? | — | Yes |
| Order notes | WC | Interactive demo: internal vs customer-visible notes (admin); portal shows customer-visible only. Nothing is sent | Yes |
| Order statuses | WC | Interactive demo: received → preparing → on the way → delivered, cancel with reason, status history | Yes |
| Cancellations, refunds | WC | Cancel: interactive demo. Refunds: in the model, shown read-only; not processed | Yes |
| Admin order list and detail | WC | Interactive demo (search, filters, sort, pagination, quick next step) | Yes |
| Admin creates order for a customer | WC | Interactive demo (customer search, saved/edited addresses, products + variations at customer price, totals preview) | Yes |
| Admin adjusts item fulfilled weight / agreed price | Plugin? | Interactive demo with reason, before/after preview and audit history (quantity changes not yet) | Yes |

## 5. Bangladesh locations, shipping and delivery

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Store address, country, currency, timezone | WC | Static config (BD / BDT / Asia-Dhaka defaults) | Yes (admin editing) |
| Store division, district/city, postcode; selling locations; shipping destinations | WC + New (division/district) | Interactive demo: store location in Settings; shipping destinations via zones (Bangladesh only) | Yes |
| Customer address: division, district, upazila/thana/locality, postcode, street, phone | New (WC has state/city only) | Interactive demo (admin address book, one default per type) | Yes |
| Postcode lookup suggesting location fields, with manual correction | New | Interface demo with 12 labelled sample postcodes; suggestions applied only on click | Yes (verified dataset) |
| Multiple delivery addresses | Plugin? | Interactive demo (admin address book) | Yes |
| Shipping zones (division / district / postcode + fallback) | WC + New | Interactive demo; one zone per location; deterministic matching (postcode > district > division > fallback) | Yes |
| Shipping methods: flat rate, weight tiers, subtotal tiers, free over subtotal, local pickup, class adjustments | WC | Interactive demo with **sample rates**; tier/overlap validation; variation weight overrides product | Yes (same calculation at cart/checkout) |
| Shipping charge on admin orders (suggested or agreed with reason) | New | Interactive demo; decision stored on the order; saved amounts never recalculated | Yes |
| Admin shipping rate preview (address + cart → zone, weight, subtotal, method, charge) | New | Interactive demo with examples | Yes (endpoint) |
| Delivery date / route tied to the order address | Plugin? | Types | Yes |

## 6. Tax, payment and store settings

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Tax on/off, prices include/exclude tax, shipping taxable + shipping class | WC | Interactive demo (Tax settings) | Yes |
| Tax classes on products, inherited/overridden by variations | WC | Existing product editor fields; classes overview with usage and fallback status | Yes |
| Tax rates by class and location (country / division / district / postcode, country = fallback) | WC + New | Interactive demo with **fictional** rates; conflict/range/class validation; deterministic matching | Yes (**authoritative calculation**) |
| Tax preview (address, customer, products, discounts, shipping method) | New | Interactive demo with examples | Yes (endpoint) |
| Tax on admin orders with rate/amount snapshots | New | Interactive demo: calculated before saving; snapshot stored; rate edits never change orders | Yes |
| Tax filing, collection, refunds | WC / New | Not in scope | Yes |
| Payment methods: enable, configuration, test/live, connection state | WC | — | Yes |
| Gateway keys, processing, webhooks, refunds | WC | — (secrets never in client code or browser storage) | Yes |
| Store contact details, address, weight/dimension units (currency BDT and Asia/Dhaka fixed) | WC | Interactive demo (Settings) | Yes |
| Email templates | WC | — | Yes |
| Staff settings | WC | — | Yes |

## 7. Customer portal

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Dashboard (order counts) | New | Read-only demo | Yes |
| Spending metrics | New | — | Yes |
| Order history and details | WC | Read-only demo | Yes |
| Quick order | Plugin? | Placeholder | Yes |
| Reorder | WC | — | Yes |
| Profile, addresses, notifications | WC / New | Read-only demo | Yes |
| Quotes, saved lists, CSV order upload | New | Planned; behaviour not yet specified | Yes |

## 8. Delivery reminders

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Admin reminder list | Plugin? | Read-only demo | Yes |
| Create / edit, details, templates, previews | Plugin? | — | Yes |
| Schedules and send logs | Plugin? | — (schedule is free text) | Yes |
| Location / route targeting | Plugin? | Types | Yes |
| Targeting customers with multiple saved addresses | New | — | Yes |
| Different messages with vs without an upcoming order | New | — | Yes |
| Scheduling and sending | — | — | Yes (worker) |

## 9. Analytics

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Revenue, orders, average order value, active customers | WC (Analytics) | Interactive demo (admin dashboard) | Yes |
| Revenue trend and order-status breakdown | WC (Analytics) | Interactive demo | Yes |
| Date range filter | WC (Analytics) | Interactive demo (presets + custom) | Yes |
| Comparison between two periods | WC (Analytics) | Interactive demo (previous period, same period last year, custom) | Yes |
| Top products / categories / customers with change vs comparison | WC (Analytics) | Interactive demo (top 5) | Yes |
| Further ranking filters (e.g. by category or location) | WC (Analytics) | — | Yes |
| Low-stock alerts | WC | Read-only demo | Yes |
| Pending approvals summary | Plugin? | Read-only demo | Yes |
| Other operational summaries (orders to prepare, routes today) | New | — | Yes |

## Cross-cutting

| Feature | Source | Frontend status | Backend |
| --- | --- | --- | --- |
| Light / dark theme (system default, saved choice) | New | Done (frontend-only) | No |
| Search, filters, sorting and date ranges on every admin and portal listing (server-side, state in the URL) | New | Interactive demo | Yes (real queries) |
| Collapsible admin sidebar (saved per browser) | New | Done (frontend-only) | No |
| Mobile layout (430px) | New | Mobile-first throughout; admin dashboard verified at 430px in both themes | No |
