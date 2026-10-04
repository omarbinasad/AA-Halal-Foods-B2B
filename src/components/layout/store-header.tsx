import Link from "next/link";
import { applyCta, storeNav } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";

const linkClass = "rounded-ui px-3 py-2 text-sm font-medium text-muted hover:text-foreground";

export function StoreHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="ml-4 hidden md:block">
          <ul className="flex items-center gap-1">
            {storeNav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} className={linkClass} activeClassName="!text-brand">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/cart" className={linkClass}>
            Cart
          </Link>
          <ThemeToggle />
          <Link href="/login" className={`${linkClass} hidden sm:inline-flex`}>
            Log in
          </Link>
          <ButtonLink href={applyCta.href} size="sm" className="hidden md:inline-flex">
            {applyCta.label}
          </ButtonLink>

          <MobileMenu>
            <nav aria-label="Main mobile">
              <ul className="space-y-1">
                {storeNav.map((item) => (
                  <li key={item.href}>
                    <NavLink href={item.href} className={`${linkClass} block`} activeClassName="!text-brand">
                      {item.label}
                    </NavLink>
                  </li>
                ))}
                <li>
                  <Link href="/login" className={`${linkClass} block`}>
                    Log in
                  </Link>
                </li>
              </ul>
            </nav>
            <ButtonLink href={applyCta.href} className="mt-3 w-full">
              {applyCta.label}
            </ButtonLink>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
