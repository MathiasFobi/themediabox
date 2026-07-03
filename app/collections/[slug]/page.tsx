import { notFound } from "next/navigation";
import collections from "@/data/collections.json";
import type { Collection } from "../../types";
import CollectionClient from "./CollectionClient";

const allCollections = collections as unknown as Collection[];

export function generateStaticParams() {
  return allCollections.map((c) => ({ slug: c.slug }));
}

export default function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = allCollections.find((c) => c.slug === params.slug);
  if (!collection) notFound();
  return <CollectionClient collection={collection} />;
}
