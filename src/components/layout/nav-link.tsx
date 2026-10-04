"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

interface NavLinkProps {
  href: Route;
  /** Only match the exact path (use for section roots like /account). */
  exact?: boolean;
  className?: string;
  activeClassName?: string;
  /** Tooltip, e.g. when the label is visually hidden. */
  title?: string;
  children: ReactNode;
}

/** Link that marks itself with aria-current when its route is active. */
export function NavLink({ href, exact, className, activeClassName, title, children }: NavLinkProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link href={href} title={title} aria-current={active ? "page" : undefined} className={cx(className, active && activeClassName)}>
      {children}
    </Link>
  );
}
