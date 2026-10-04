import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cx } from "@/lib/cx";

/**
 * Logo slot: renders the configured logo image, or a neutral text placeholder.
 * `inverse` is for dark backgrounds such as the admin sidebar.
 */
export function Logo({ href = "/", inverse = false, nameClassName }: { href?: "/" | "/account" | "/admin"; inverse?: boolean; nameClassName?: string }) {
  const { logo, name } = siteConfig;
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-2 rounded-ui font-semibold tracking-tight">
      {logo.src ? (
        <Image src={logo.src} alt={name} width={logo.width} height={logo.height} priority className="h-8 w-auto" />
      ) : (
        <>
          <span
            aria-hidden
            className={cx(
              "grid size-8 place-items-center rounded-ui text-sm",
              inverse ? "bg-sidebar-active-foreground text-sidebar" : "bg-brand text-brand-contrast",
            )}
          >
            {name.charAt(0)}
          </span>
          <span className={cx("text-base", inverse && "text-sidebar-active-foreground", nameClassName)}>{name}</span>
        </>
      )}
    </Link>
  );
}
