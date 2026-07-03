import { notFound } from "next/navigation";
import products from "@/data/products.json";
import type { Product } from "../../types";
import ProductDetailClient from "./ProductDetailClient";

const allProducts = products as unknown as Product[];

export function generateStaticParams() {
  return allProducts.map((p) => ({ slug: p.slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = allProducts.find((p) => p.slug === params.slug);
  if (!product) notFound();
  return <ProductDetailClient product={product} />;
}
