"use client";
import Link from "next/link";
import { formatPrice } from "@/lib/price-format";
import type { ProductListItem } from "@/types/product-types";

export default function ProductCard({ product }: { product: ProductListItem }) {
  const href = `/products/${product.slug || product.id}`;

  return (
    <div
      className="
      relative z-0
        flex flex-col justify-between
        bg-gradient-to-br from-pink-100 via-indigo-50 to-yellow-100
        rounded-2xl shadow-xl border-2 border-indigo-200
        p-6 transition hover:-translate-y-1 hover:shadow-2xl hover:border-pink-400
        min-h-[300px] w-full
      "
    >
      <Link
        href={href}
        aria-label={`View details for ${product.name}`}
        className="block"
      >
        <h3 className="font-extrabold text-pink-700 text-lg mb-2 line-clamp-2">
          {product.name}
        </h3>
        <div className="text-2xl font-bold text-indigo-800">
          {formatPrice(
            {
              centAmount: product?.price?.price?.centAmount,
              currency: product?.price?.price?.currencyCode ?? "USD",
              fractionDigits: product?.price?.price?.fractionDigits ?? 2,
            },
            "en-US"
          )}
        </div>
      </Link>
    </div>
  );
}
