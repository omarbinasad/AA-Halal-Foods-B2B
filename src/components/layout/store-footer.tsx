import Link from "next/link";
import { siteConfig, storeNav } from "@/config/site";

export function StoreFooter() {
  const { name, tagline, contact } = siteConfig;
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="mt-1 text-muted">{tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2">
            {storeNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-muted hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <address className="space-y-1 text-muted not-italic">
          <p>{contact.address}</p>
          <p>{contact.phone}</p>
          <p>{contact.email}</p>
          <p>{contact.hours}</p>
        </address>
      </div>
      <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {name}. Prices exclude VAT unless stated.
      </p>
    </footer>
  );
}
