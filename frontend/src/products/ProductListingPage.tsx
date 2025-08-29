"use client";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "@/components/AddToCartButton";
import { fetchProductList } from "@/lib/api-client";
import { useEffect, useState } from "react";
import ViewCartButton from "@/components/ViewCart";
import type { ProductListItem } from "@/types/product-types";

export default function ProductListingPage() {
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { results } = await fetchProductList(24, 0);
        if (alive) setResults(results || []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="mb-6 text-2xl font-semibold text-gray-900">Product Listing Page</h2>

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : results.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
          No products found.
        </div>
      ) : (
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {results.map((product) => (
            <div key={product.id} className="flex flex-col items-stretch">
              <ProductCard product={product} />
              <ProductCardActions
                productId={product.id}
                variantId={product.variantId ?? 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCardActions({ productId, variantId }: { productId: string; variantId: number }) {
  const [ok, setOk] = useState<null | boolean>(null);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div
      className="mt-2 flex items-center gap-2 px-2 relative z-50 pointer-events-auto"
      onMouseDown={stop}
      onClick={stop}
    >
      <AddToCartButton
        productId={productId}
        variantId={variantId}
        quantity={1}
        redirectToCart={false}
        onSuccess={() => {
          setOk(true);
          document.dispatchEvent(new CustomEvent("cart:changed"));
          setTimeout(() => setOk(null), 1600);
        }}
        onError={() => {
          setOk(false);
          setTimeout(() => setOk(null), 2200);
        }}
      />
      {ok === true && <span className="text-green-600 text-sm">Added</span>}
      {ok === false && <span className="text-red-600 text-sm">Failed</span>}

      <ViewCartButton />
    </div>
  );
}
