import { notFound } from "next/navigation";
import services from "@/data/services.json";
import type { Service } from "../../types";
import ServiceDetailClient from "./ServiceDetailClient";

const allServices = services as unknown as Service[];

export function generateStaticParams() {
  return allServices.map((s) => ({ slug: s.slug }));
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const service = allServices.find((s) => s.slug === params.slug);
  if (!service) notFound();
  return <ServiceDetailClient service={service} />;
}
