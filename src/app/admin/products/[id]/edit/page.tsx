import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionNotice } from "@/components/admin/demo-notice";
import { ProductForm } from "@/components/admin/products/product-form";
import { repositories } from "@/lib/data";
import { param } from "@/lib/list-params";
import { loadProductFormOptions } from "../../form-options";

export async function generateMetadata({ params }: PageProps<"/admin/products/[id]/edit">): Promise<Metadata> {
  const product = await repositories.products.getById((await params).id);
  return { title: product ? `Edit ${product.name}` : "Product not found" };
}

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]/edit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, options] = await Promise.all([repositories.products.getById(id), loadProductFormOptions()]);
  if (!product) notFound();
  // Only the selected linked products are loaded — never the whole catalog.
  const [upsells, crossSells] = await Promise.all([
    repositories.products.getPicks(product.upsellIds),
    repositories.products.getPicks(product.crossSellIds),
  ]);

  return (
    <>
      <ActionNotice notice={param(sp, "notice")} />
      {/* Keyed by id + page notice: page actions (archive/restore) reload the form; a normal save keeps its state. */}
      <ProductForm key={`${product.id}-${param(sp, "notice") ?? ""}`} product={product} options={options} upsells={upsells} crossSells={crossSells} />
    </>
  );
}
