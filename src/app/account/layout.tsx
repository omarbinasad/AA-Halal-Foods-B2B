import type { Metadata } from "next";
import { PortalShell } from "@/components/layout/portal-shell";
import { Notice } from "@/components/ui/feedback";
import { accountNav } from "@/config/site";
import { getPortalCustomerId } from "@/lib/auth/session";
import { repositories } from "@/lib/data";

export const metadata: Metadata = {
  title: { default: "My account", template: "%s | My account" },
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const customer = await repositories.customers.getById(await getPortalCustomerId());

  return (
    <PortalShell
      area="Customer portal"
      home="/account"
      nav={accountNav}
      navLabel="Account"
      userLabel={customer?.companyName ?? "Customer"}
      banner={
        <Notice tone="warning" title="Preview mode">
          There is no sign-in yet. This portal shows sample data for a demo customer and is not access-controlled.
        </Notice>
      }
    >
      {children}
    </PortalShell>
  );
}
