import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/sections/ServiceDetail";
import { getService } from "@/lib/cms";
import { pageMetadata } from "@/lib/metadata";

const SLUG = "medical-relief";

export async function generateMetadata() {
  const service = await getService(SLUG);
  return service ? pageMetadata({ title: service.seoTitle || service.title, description: service.metaDescription, path: service.href }) : {};
}

export default async function Page() {
  const service = await getService(SLUG);
  if (!service) notFound();
  return <ServiceDetail service={service} />;
}
