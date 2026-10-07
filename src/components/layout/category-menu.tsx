"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";

export interface CategoryLink {
  name: string;
  slug: string;
  child: boolean;
}

/** "All categories" disclosure: keyboard accessible, closes on Escape, outside click and navigation. */
export function CategoryMenu({ categories }: { categories: CategoryLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-ui bg-brand px-3 text-sm font-semibold text-brand-contrast hover:bg-brand-hover"
      >
        <Icon name="menu" className="size-4" />
        All categories
        <Icon name="chevronDown" className="size-4" />
      </button>
      <div id={panelId} hidden={!open} className="absolute top-full left-0 z-40 mt-2 w-64 rounded-ui border border-line bg-surface p-2 shadow-lg">
        <ul>
          <li>
            <Link href="/shop" className="block rounded-ui px-3 py-2 text-sm font-medium hover:bg-surface-muted">All products</Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link href={`/shop?category=${c.slug}`} className={`block rounded-ui py-2 pr-3 text-sm hover:bg-surface-muted ${c.child ? "pl-7 text-muted" : "pl-3"}`}>
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
