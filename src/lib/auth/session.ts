import "server-only";

import { cookies } from "next/headers";
import type { AccountStatus, ID } from "@/lib/types";

/**
 * MOCK ONLY — there is no authentication yet.
 *
 * The viewer is chosen by the MOCK_VIEWER env var so the UI can be previewed
 * as a guest, an approved customer, or an admin. This provides NO security:
 * price visibility and account/admin access must be enforced by the backend
 * (and a real session check here) before launch.
 *
 * Both helpers read request cookies (where the real session will live), which
 * makes every page using them render per request — personalized pages are
 * never prerendered or served from a shared cache.
 */
export type Viewer =
  | { kind: "guest" }
  | { kind: "customer"; customerId: ID; status: AccountStatus }
  | { kind: "admin"; userId: ID };

/** Demo customer used to preview the customer portal. */
export const DEMO_CUSTOMER_ID = "cus-001";

export async function getViewer(): Promise<Viewer> {
  await cookies();
  switch (process.env.MOCK_VIEWER) {
    case "customer":
      return { kind: "customer", customerId: DEMO_CUSTOMER_ID, status: "approved" };
    case "admin":
      return { kind: "admin", userId: "admin-1" };
    default:
      return { kind: "guest" };
  }
}

/**
 * Customer whose portal is shown. MOCK: always the demo customer so the portal
 * can be previewed; the real version must derive this from the session.
 */
export async function getPortalCustomerId(): Promise<ID> {
  await cookies();
  return DEMO_CUSTOMER_ID;
}

/** True when the viewer may see wholesale prices (UI hint only, not enforcement). */
export function canSeeWholesalePrices(viewer: Viewer) {
  return viewer.kind === "admin" || (viewer.kind === "customer" && viewer.status === "approved");
}

/**
 * MOCK: the admin performing an action, for history and audit records.
 * The real version must come from the authenticated session, and the backend
 * must check these permissions on every mutation.
 */
export async function getAdminActor(): Promise<{ id: ID; name: string; role: "admin"; permissions: string[] }> {
  await cookies();
  return { id: "admin-1", name: "Demo admin", role: "admin", permissions: ["orders.create", "orders.update", "orders.adjust", "customers.manage", "customers.approve", "customer-groups.manage", "pricing.manage", "settings.manage", "shipping.manage", "tax.manage"] };
}
