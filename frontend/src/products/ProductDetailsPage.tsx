"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/price-format";
import type { ProductDetail } from "@/types/product-types";
import QuantityStepper from "@/components/QuantityStepper";
import AddToCartButton from "@/components/AddToCartButton";

export default function ProductDetailPage({
  product,
}: {
  product: ProductDetail;
}) {
  const products = product;
  const masterVariant = products.masterVariant;
  const [qty, setQty] = useState(1);

  return (
    <div className="flex items-center justify-center min-h-[70vh] py-10 px-2">
      <div className="w-full max-w-xl p-8 rounded-2xl shadow-2xl bg-white/80 space-y-6 relative z-0 pointer-events-auto">
        <div className="mb-2 text-sm text-gray-500">
          <Link href="/" className="hover:underline">
            Back to Products
          </Link>
        </div>

        <h3 className="text-xl font-extrabold text-indigo-900 tracking-tight">
          {products.name}
        </h3>

        {products.description && (
          <p className="mt-2 text-lg text-pink-700">{products.description}</p>
        )}

        <div className="mt-2 text-xl font-bold text-pink-600">
          {formatPrice(
            {
              centAmount: masterVariant?.price?.price?.centAmount,
              currency: masterVariant?.price?.price?.currencyCode ?? "USD",
              fractionDigits: masterVariant?.price?.price?.fractionDigits ?? 2,
            },
            "en-US"
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <QuantityStepper value={qty} onChange={setQty} />
          <AddToCartButton
            productId={products.id}
            variantId={masterVariant?.id ?? 1}
            quantity={qty}
          />
        </div>
      </div>
    </div>
  );
}
