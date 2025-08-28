import ProductDetailPage from "@/products/ProductDetailsPage";
import { fetchProductDetail } from "@/lib/api-client";

export default async function Page({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;      
  const product = await fetchProductDetail(idOrSlug);
  return <ProductDetailPage product={product} />;
}
