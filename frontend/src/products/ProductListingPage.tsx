import ProductCard from "@/components/ProductCard";
import { fetchProductList } from "@/lib/api-client";

export default async function ProductListingPage() {
  const { results } = await fetchProductList(24, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Product Listing Page</h2>
      <div
        className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {results.length === 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          No products found.
        </div>
      )}
    </div>
  );
}
