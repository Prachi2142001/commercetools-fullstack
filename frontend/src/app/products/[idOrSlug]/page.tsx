// src/app/products/[idOrSlug]/page.tsx
import { fetchProductDetail } from "@/lib/api-client";
import ProductDetailPage from "@/products/ProductDetailsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;               // ✅ await params first
  const product = await fetchProductDetail(idOrSlug); // Server fetch
  return <ProductDetailPage product={product} />;     // Pass data to client UI
}
