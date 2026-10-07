import Link from "next/link";
import { applyCta, siteConfig, storeNav } from "@/config/site";
import { homeContent } from "@/config/storefront";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { repositories } from "@/lib/data";
import { CategoryMenu, type CategoryLink } from "./category-menu";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

const iconLink = "inline-flex items-center gap-2 rounded-ui px-2 py-2 text-sm font-medium text-muted hover:text-foreground";

/** Product/SKU search that lands on the existing catalog route (/shop?q=…). */
function SearchForm({ id, className }: { id: string; className?: string }) {
  return (
    <form role="search" action="/shop" className={className}>
      <label htmlFor={id} className="sr-only">Search products or SKU</label>
      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          id={id}
          name="q"
          type="search"
          placeholder="Search products or SKU"
          autoComplete="off"
          className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-base placeholder:text-muted focus:border-brand sm:text-sm"
        />
      </div>
    </form>
  );
}

export async function StoreHeader() {
  const categories = await repositories.products.listCategories();
  const roots = categories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name));
  const links: CategoryLink[] = roots.flatMap((r) => [
    { name: r.name, slug: r.slug, child: false },
    ...categories.filter((c) => c.parentId === r.id).map((c) => ({ name: c.name, slug: c.slug, child: true })),
  ]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      {/* Top bar */}
      <div className="border-b border-line bg-brand-soft/60">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between gap-4 px-4 text-xs text-muted sm:px-6">
          <p className="flex min-w-0 items-center gap-2 truncate">
            <Icon name="truck" className="size-4 shrink-0 text-brand" />
            <span className="truncate">{homeContent.topBar}</span>
          </p>
          <a href={`tel:${siteConfig.contact.phone.replace(/[^+\d]/g, "")}`} className="hidden shrink-0 hover:text-foreground sm:inline">
            {siteConfig.contact.phone}
          </a>
        </div>
      </div>

      {/* Logo, search, account, cart */}
      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <SearchForm id="header-search" className="mx-auto hidden w-full max-w-xl md:block" />
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/account" className={iconLink} aria-label="Account">
            <Icon name="user" className="size-5" />
            <span className="hidden lg:inline">Account</span>
          </Link>
          <Link href="/cart" className={iconLink} aria-label="Cart">
            <Icon name="cart" className="size-5" />
            <span className="hidden lg:inline">Cart</span>
          </Link>
          <ThemeToggle />
          <MobileMenu>
            <nav aria-label="Main mobile" className="space-y-4">
              <ul className="space-y-1">
                {storeNav.map((item) => (
                  <li key={item.href}>
                    <NavLink href={item.href} className="block rounded-ui px-3 py-2 text-sm font-medium hover:bg-surface-muted" activeClassName="text-brand">
                      {item.label}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <Link href="/login" className="block rounded-ui px-3 py-2 text-sm font-medium hover:bg-surface-muted">Log in</Link>
                </li>
              </ul>
              <div>
                <p className="px-3 text-xs font-semibold tracking-wide text-muted uppercase">Categories</p>
                <ul className="mt-1 grid grid-cols-2 gap-1">
                  {links.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/shop?category=${c.slug}`} className="block rounded-ui px-3 py-2 text-sm hover:bg-surface-muted">{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <ButtonLink href={applyCta.href} className="w-full">{applyCta.label}</ButtonLink>
            </nav>
          </MobileMenu>
        </div>
      </div>

      {/* Mobile search */}
      <div className="px-4 pb-3 md:hidden">
        <SearchForm id="header-search-mobile" />
      </div>

      {/* Category menu, navigation, application CTA (desktop) */}
      <div className="hidden border-t border-line md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 sm:px-6">
          <CategoryMenu categories={links} />
          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {storeNav.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} className="rounded-ui px-3 py-2 text-sm font-medium text-muted hover:text-foreground" activeClassName="!text-brand">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <ButtonLink href={applyCta.href} size="sm" className="ml-auto">
            {applyCta.label}
            <Icon name="arrowRight" className="size-4" />
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
