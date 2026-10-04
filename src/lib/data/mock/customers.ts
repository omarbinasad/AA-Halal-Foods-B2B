import type { AccountStatusEvent, Actor, Address, Customer, CustomerGroup, CustomerNotification } from "@/lib/types";
import { createRandom } from "./random";

const seedGroups: CustomerGroup[] = [
  { id: "grp-restaurant", name: "Restaurants", description: "Restaurants, hotels and commercial kitchens." },
  { id: "grp-retail", name: "Retail grocers", description: "Grocery and convenience stores." },
  { id: "grp-distributor", name: "Distributors", description: "Regional wholesale distributors." },
  { id: "grp-catering", name: "Caterers", description: "Event and institutional catering." },
];

/** Sample locations (division → district → area). Postcodes are illustrative only. */
export const mockLocations = [
  { division: "Dhaka", district: "Dhaka", area: "Gulshan", postalCode: "1212", routeId: "route-dhaka" },
  { division: "Dhaka", district: "Dhaka", area: "Dhanmondi", postalCode: "1209", routeId: "route-dhaka" },
  { division: "Dhaka", district: "Dhaka", area: "Mirpur", postalCode: "1216", routeId: "route-dhaka" },
  { division: "Dhaka", district: "Dhaka", area: "Uttara", postalCode: "1230", routeId: "route-dhaka" },
  { division: "Dhaka", district: "Gazipur", area: "Tongi", postalCode: "1710", routeId: "route-dhaka" },
  { division: "Dhaka", district: "Narayanganj", area: "Sadar", postalCode: "1400", routeId: "route-dhaka" },
  { division: "Chattogram", district: "Chattogram", area: "Agrabad", postalCode: "4100", routeId: "route-chattogram" },
  { division: "Chattogram", district: "Chattogram", area: "Halishahar", postalCode: "4216", routeId: "route-chattogram" },
  { division: "Chattogram", district: "Cox's Bazar", area: "Sadar", postalCode: "4700", routeId: "route-chattogram" },
  { division: "Chattogram", district: "Cumilla", area: "Sadar", postalCode: "3500", routeId: "route-chattogram" },
  { division: "Sylhet", district: "Sylhet", area: "Zindabazar", postalCode: "3100", routeId: "route-courier" },
  { division: "Khulna", district: "Khulna", area: "Sonadanga", postalCode: "9100", routeId: "route-courier" },
  { division: "Khulna", district: "Jashore", area: "Sadar", postalCode: "7400", routeId: "route-courier" },
  { division: "Rajshahi", district: "Rajshahi", area: "Boalia", postalCode: "6100", routeId: "route-courier" },
  { division: "Rajshahi", district: "Bogura", area: "Sadar", postalCode: "5800", routeId: "route-courier" },
  { division: "Barishal", district: "Barishal", area: "Kotwali", postalCode: "8200", routeId: "route-courier" },
  { division: "Rangpur", district: "Rangpur", area: "Sadar", postalCode: "5400", routeId: "route-courier" },
  { division: "Mymensingh", district: "Mymensingh", area: "Sadar", postalCode: "2200", routeId: "route-courier" },
] as const;

type Location = (typeof mockLocations)[number];

const phone = (n: number) => `+880 1700-${String(n).padStart(6, "0")}`;

function address(id: string, loc: Location, fields: Pick<Address, "label" | "recipientName" | "companyName" | "phone"> & Partial<Address>): Address {
  return {
    id,
    type: "shipping",
    isDefault: true,
    country: "BD",
    division: loc.division,
    district: loc.district,
    area: loc.area,
    postalCode: loc.postalCode,
    addressLine1: "House 00, Road 00 (sample)",
    ...fields,
  };
}

const [gulshan, , , , tongi, , agrabad, , , , sylhet, khulna] = mockLocations;

const DEMO_ADMIN: Actor = { id: "admin-1", name: "Demo admin", role: "admin" };
const applicant = (c: { id: string; companyName: string }): Actor => ({ id: c.id, name: c.companyName, role: "customer" });

/** Registration → decisions, as an audit trail. */
function statusTrail(c: Pick<Customer, "id" | "companyName" | "createdAt">, steps: [AccountStatusEvent["to"], string, string?][]): AccountStatusEvent[] {
  const events: AccountStatusEvent[] = [{ id: `${c.id}-s1`, to: "pending", at: c.createdAt, by: applicant(c), reason: "Applied for a trade account" }];
  for (const [to, at, reason] of steps) {
    events.push({ id: `${c.id}-s${events.length + 1}`, from: events[events.length - 1].to, to, at, by: DEMO_ADMIN, reason });
  }
  return events;
}

type Seed = Omit<Customer, "statusHistory">;
const handWrittenSeeds: Seed[] = [
  {
    id: "cus-001",
    companyName: "Sample Kitchen Gulshan",
    contactName: "Rahim Uddin",
    email: "orders@kitchen.example.com",
    phone: phone(1),
    businessType: "Restaurant",
    status: "approved",
    groupId: "grp-restaurant",
    deliveryRouteId: "route-dhaka",
    addresses: [
      address("addr-001", gulshan, { label: "Restaurant", recipientName: "Rahim Uddin", companyName: "Sample Kitchen Gulshan", phone: phone(1) }),
      address("addr-002", tongi, { label: "Central kitchen", recipientName: "Kitchen manager", companyName: "Sample Kitchen Gulshan", phone: phone(2), isDefault: false }),
      address("addr-003", gulshan, { type: "billing", label: "Head office", recipientName: "Accounts", companyName: "Sample Kitchen Gulshan", phone: phone(3), addressLine2: "Level 3 (sample)" }),
    ],
    createdAt: "2025-01-10T10:00:00+06:00",
    approvedAt: "2025-01-12T15:00:00+06:00",
  },
  {
    id: "cus-002",
    companyName: "Example Mart Agrabad",
    contactName: "Nusrat Jahan",
    email: "buying@mart.example.com",
    phone: phone(4),
    businessType: "Grocery store",
    status: "approved",
    groupId: "grp-retail",
    deliveryRouteId: "route-chattogram",
    addresses: [address("addr-004", agrabad, { label: "Store", recipientName: "Nusrat Jahan", companyName: "Example Mart Agrabad", phone: phone(4) })],
    createdAt: "2025-02-02T10:00:00+06:00",
    approvedAt: "2025-02-05T11:00:00+06:00",
  },
  {
    id: "cus-003",
    companyName: "Demo Kebab Corner",
    contactName: "Kamal Hossain",
    email: "hello@kebab.example.com",
    phone: phone(5),
    businessType: "Restaurant",
    status: "pending",
    addresses: [address("addr-005", sylhet, { label: "Shop", recipientName: "Kamal Hossain", companyName: "Demo Kebab Corner", phone: phone(5) })],
    createdAt: "2026-09-28T18:30:00+06:00",
  },
  {
    id: "cus-004",
    companyName: "Placeholder Catering Co.",
    contactName: "Farzana Akter",
    email: "events@catering.example.com",
    phone: phone(6),
    businessType: "Caterer",
    status: "suspended",
    groupId: "grp-catering",
    deliveryRouteId: "route-courier",
    addresses: [address("addr-006", khulna, { label: "Kitchen", recipientName: "Farzana Akter", companyName: "Placeholder Catering Co.", phone: phone(6) })],
    createdAt: "2025-03-20T10:00:00+06:00",
    approvedAt: "2025-03-22T10:00:00+06:00",
  },
];

const handWritten: Customer[] = handWrittenSeeds.map((c) => ({
  ...c,
  statusHistory:
    c.id === "cus-004"
      ? statusTrail(c, [["approved", c.approvedAt!], ["suspended", "2026-08-14T10:00:00+06:00", "Three overdue invoices — suspended until settled (sample)"]])
      : c.status === "approved"
        ? statusTrail(c, [["approved", c.approvedAt!, "Trade licence checked (sample)"]])
        : statusTrail(c, []),
}));

const kinds = [
  { suffix: "Demo Restaurant", businessType: "Restaurant", groupId: "grp-restaurant" },
  { suffix: "Sample Mart", businessType: "Grocery store", groupId: "grp-retail" },
  { suffix: "Example Store", businessType: "Grocery store", groupId: "grp-retail" },
  { suffix: "Demo Distributors", businessType: "Distributor", groupId: "grp-distributor" },
  { suffix: "Sample Caterers", businessType: "Caterer", groupId: "grp-catering" },
  { suffix: "Example Hotel", businessType: "Hotel", groupId: "grp-restaurant" },
] as const;

/** Generated placeholder customers spread across divisions (clearly fictional names). */
function generateCustomers(count: number): Customer[] {
  const rnd = createRandom(7);
  return Array.from({ length: count }, (_, i) => {
    const loc = mockLocations[i % mockLocations.length];
    const kind = kinds[(i + Math.floor(i / mockLocations.length)) % kinds.length];
    const id = `cus-${String(i + 101).padStart(3, "0")}`;
    const companyName = `${loc.area === "Sadar" ? loc.district : loc.area} ${kind.suffix}`;
    const pending = i % 15 === 14;
    const rejected = i === 21;
    const created = new Date(Date.UTC(2025, rnd.int(0, 5), rnd.int(1, 28)));
    const createdAt = pending ? `2026-09-${String(20 + (i % 9)).padStart(2, "0")}T12:00:00+06:00` : `${created.toISOString().slice(0, 10)}T10:00:00+06:00`;
    const status = rejected ? "rejected" : pending ? "pending" : "approved";
    const base = {
      id,
      ...(createdAt < "2026-01-01" ? { legacyWooId: 5000 + i } : {}),
      companyName,
      contactName: `Contact ${i + 1}`,
      email: `buyer${i + 1}@customer.example.com`,
      phone: phone(100 + i),
      businessType: kind.businessType,
      status,
      groupId: status === "approved" ? kind.groupId : undefined,
      deliveryRouteId: status === "approved" ? loc.routeId : undefined,
      addresses: [address(`addr-${id}`, loc, { label: "Main", recipientName: `Contact ${i + 1}`, companyName, phone: phone(100 + i) })],
      createdAt,
      approvedAt: status === "approved" ? createdAt : undefined,
    } satisfies Seed;
    return {
      ...base,
      statusHistory:
        status === "approved"
          ? statusTrail(base, [["approved", createdAt]])
          : status === "rejected"
            ? statusTrail(base, [["rejected", createdAt, "Could not verify the business address (sample)"]])
            : statusTrail(base, []),
    } satisfies Customer;
  });
}

/*
 * DEMO STORE: customers and groups live in memory on globalThis (like the catalog
 * and orders), so admin edits survive page refreshes but not a server restart.
 * Orders reference customers by id, so ids are never reused or deleted.
 */
const store = globalThis as typeof globalThis & { __mockCustomersV2?: { customers: Customer[]; groups: CustomerGroup[] } };
store.__mockCustomersV2 ??= { customers: [...handWritten, ...generateCustomers(44)], groups: seedGroups };

export const mockCustomers = store.__mockCustomersV2.customers;
export const mockCustomerGroups = store.__mockCustomersV2.groups;

export const mockNotifications: CustomerNotification[] = [
  {
    id: "ntf-001",
    customerId: "cus-001",
    kind: "delivery",
    title: "Your order is out for delivery",
    body: "Your latest order is on the Dhaka Metro route and will arrive today.",
    createdAt: "2026-09-29T16:00:00+06:00",
  },
  {
    id: "ntf-002",
    customerId: "cus-001",
    kind: "order",
    title: "Weight adjustment on ORD-10042",
    body: "Packed weight for chicken thigh differed from the ordered weight. The order total has been updated.",
    createdAt: "2026-09-29T11:20:00+06:00",
    readAt: "2026-09-29T12:00:00+06:00",
  },
  {
    id: "ntf-003",
    customerId: "cus-001",
    kind: "reminder",
    title: "Order cutoff today at 16:00",
    body: "Place your order before 16:00 for next-day delivery.",
    createdAt: "2026-09-28T09:00:00+06:00",
    readAt: "2026-09-28T09:30:00+06:00",
  },
];
