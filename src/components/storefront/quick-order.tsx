"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { quickOrderAction } from "@/app/(store)/actions";
import { StockBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format";
import type { QuickOrderResult } from "@/lib/storefront/quick-order";

const ACCESS_MESSAGE = {
  guest: { text: "Sign in to view wholesale prices and place orders.", cta: true },
  pending: { text: "Your business account is awaiting approval. Wholesale prices appear once it is approved.", cta: false },
  admin: { text: "Admin preview: wholesale prices are shown only to approved customers (set MOCK_VIEWER=customer to preview).", cta: false },
} as const;

export function QuickOrder({ initial, categories }: { initial: QuickOrderResult; categories: { slug: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const load = (next: { q: string; category: string; page: number }, delay = 0) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const n = ++request.current;
      startTransition(async () => {
        const result = await quickOrderAction(next);
        if (n === request.current) setData(result);
      });
    }, delay);
  };

  const message = data.access === "approved" ? null : ACCESS_MESSAGE[data.access];
  const showPrice = data.access === "approved";

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="relative">
          <label htmlFor="qo-search" className="sr-only">Search products or SKU</label>
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            id="qo-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              load({ q: e.target.value, category, page: 1 }, 300);
            }}
            placeholder="Search products or SKU"
            autoComplete="off"
            className="h-10 w-full rounded-ui border border-line bg-surface pr-3 pl-9 text-base placeholder:text-muted focus:border-brand sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="qo-category" className="sr-only">Category</label>
          <select
            id="qo-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              load({ q, category: e.target.value, page: 1 });
            }}
            className="h-10 w-full rounded-ui border border-line bg-surface px-3 text-base sm:text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {message ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-ui bg-brand-soft px-4 py-3 text-sm">
          <p className="flex items-center gap-2">
            <Icon name="lock" className="size-4 shrink-0 text-brand" />
            {message.text}
          </p>
          {message.cta && (
            <div className="flex gap-2">
              <ButtonLink href="/login" size="sm">Log in</ButtonLink>
              <ButtonLink href="/register" size="sm" variant="secondary">Register</ButtonLink>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-ui bg-brand-soft px-4 py-3 text-sm">
          Your wholesale prices and quantity limits are shown below. Online cart and checkout are not available yet — open a product or contact us to order.
        </p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {pending ? "Loading products" : `${data.total} product${data.total === 1 ? "" : "s"} found, page ${data.page} of ${Math.max(1, data.totalPages)}`}
      </p>

      <div className={pending ? "opacity-60 transition-opacity" : undefined}>
        {data.rows.length === 0 ? (
          <p className="rounded-ui border border-line bg-surface px-4 py-8 text-center text-sm text-muted">No products match this search.</p>
        ) : (
          <div className="overflow-hidden rounded-ui border border-line bg-surface">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem_10rem] gap-3 border-b border-line bg-surface-muted px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase sm:grid">
              <span>Product</span>
              <span>Pack size</span>
              <span>Availability</span>
              <span className="text-right">Wholesale price</span>
            </div>
            <ul className="divide-y divide-line">
              {data.rows.map((r) => (
                <li key={r.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_8rem_10rem] sm:items-center sm:gap-3">
                  <div className="row-span-3 sm:row-span-1 sm:flex sm:items-center sm:gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-ui bg-surface-muted">
                      {r.image ? <Image src={r.image.src} alt="" fill sizes="48px" className="object-cover" /> : <Icon name="box" className="absolute inset-0 m-auto size-5 text-muted" />}
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <Link href={`/shop/${r.slug}`} className="block truncate text-sm font-semibold hover:text-brand hover:underline">{r.name}</Link>
                      <span className="text-xs text-muted">{r.sku}</span>
                    </div>
                  </div>
                  <div className="min-w-0 sm:hidden">
                    <Link href={`/shop/${r.slug}`} className="block text-sm font-semibold hover:text-brand hover:underline">{r.name}</Link>
                    <span className="text-xs text-muted">{r.sku}</span>
                  </div>
                  <span className="text-sm text-muted">{r.packSize}</span>
                  <span className="flex flex-wrap items-center justify-between gap-2 sm:block">
                    <StockBadge status={r.stock.status} />
                    <span className="text-right text-sm sm:hidden">
                      {showPrice ? <PriceCell row={r} /> : <LockedPrice access={data.access} />}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm sm:block">{showPrice ? <PriceCell row={r} /> : <LockedPrice access={data.access} />}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {data.totalPages > 1 && (
        <nav aria-label="Quick order pages" className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            disabled={data.page <= 1 || pending}
            onClick={() => load({ q, category, page: data.page - 1 })}
            className="inline-flex h-9 items-center gap-1 rounded-ui border border-line px-3 font-medium hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="arrowLeft" className="size-4" /> Previous
          </button>
          <span className="text-muted">Page {data.page} of {data.totalPages}</span>
          <button
            type="button"
            disabled={data.page >= data.totalPages || pending}
            onClick={() => load({ q, category, page: data.page + 1 })}
            className="inline-flex h-9 items-center gap-1 rounded-ui border border-line px-3 font-medium hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <Icon name="arrowRight" className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}

function LockedPrice({ access }: { access: QuickOrderResult["access"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <Icon name="lock" className="size-4" /> {access === "pending" ? "Awaiting approval" : access === "admin" ? "Customers only" : "Login to view"}
    </span>
  );
}

function PriceCell({ row }: { row: QuickOrderResult["rows"][number] }) {
  return (
    <span className="inline-block text-right">
      {row.price !== undefined ? <span className="font-semibold tabular-nums">{formatMoney(row.price)}</span> : <span className="text-muted">See options</span>}
      {(row.priceNote || row.minQuantity !== undefined) && (
        <span className="block text-xs text-muted">
          {[row.priceNote, row.minQuantity !== undefined && `min ${row.minQuantity}${row.maxQuantity !== undefined ? `, max ${row.maxQuantity}` : ""}`].filter(Boolean).join(" · ")}
        </span>
      )}
    </span>
  );
}
