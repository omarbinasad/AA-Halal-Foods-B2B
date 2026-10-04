import Link from "next/link";
import { StockBadge } from "@/components/ui/badge";
import { formatWeight, formatMoney } from "@/lib/format";
import type { ProductSummary, Money } from "@/lib/types";
import { ProductImage } from "./product-image";

interface ProductCardProps {
  product: ProductSummary;
  /** Wholesale unit price for the current viewer; omit to hide pricing (guests). */
  price?: Money;
}

export function ProductCard({ product, price }: ProductCardProps) {
  return (
    <article className="group relative flex flex-col rounded-ui border border-line bg-surface p-3">
      <ProductImage image={product.image} />
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="text-sm leading-snug font-semibold">
          <Link href={`/shop/${product.slug}`} className="after:absolute after:inset-0 after:rounded-ui group-hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-muted">
          {formatWeight(product.weight)} / {product.unitLabel}
          {product.isVariableWeight && " · priced by weight"}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
          {price !== undefined ? (
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(price)} <span className="text-xs font-normal text-muted">excl. tax</span>
            </p>
          ) : (
            <p className="text-xs text-muted">Log in for wholesale price</p>
          )}
          <StockBadge status={product.stock.status} />
        </div>
      </div>
    </article>
  );
}
