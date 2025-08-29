"use client";

import { useEffect, useRef, useState } from "react";
import { addLineItem } from "@/lib/cart-client";
import { useRouter } from "next/navigation";

type Props = {
  productId: string;
  variantId?: number;
  quantity?: number;
  redirectToCart?: boolean;
  className?: string;
  name?: string;      // unused but kept for compatibility
  priceText?: string; // unused but kept for compatibility
};

export default function AddToCartButton({
  productId,
  variantId = 1,
  quantity = 1,
  redirectToCart = true,
  className = "",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Native listener to detect overlays / hydration issues
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const nativeClick = () => console.log("[ATC:native] click");
    const nativeDown  = () => console.log("[ATC:native] mousedown");

    el.addEventListener("click", nativeClick);
    el.addEventListener("mousedown", nativeDown);
    console.log("[ATC] mounted", { productId, variantId, quantity });

    return () => {
      el.removeEventListener("click", nativeClick);
      el.removeEventListener("mousedown", nativeDown);
    };
  }, [productId, variantId, quantity]);

  async function onClick() {
    console.log("[ATC:react] click", { productId, variantId, quantity });
    try {
      setErr("");
      setLoading(true);

      const res = await addLineItem({ productId, variantId, quantity });
      console.log("[ATC] addLineItem OK", { cartId: res?.id });

      if (redirectToCart) {
        // fallback: use hard navigation if router push were ever skipped
        try {
          router.push("/cart");
        } catch {
          window.location.href = "/cart";
        }
      }
    } catch (e: any) {
      console.error("[ATC] addLineItem FAIL", e);
      setErr(e?.message || "Failed to add to cart");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        ref={btnRef}
        id="atc-btn"
        type="button"
        onClick={onClick}
        disabled={loading}
        // Make sure nothing blocks the pointer:
        className="relative z-[9999] pointer-events-auto bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-60 cursor-pointer"
        style={{ pointerEvents: "auto" }}
      >
        {loading ? "Adding…" : "Add to Cart"}
      </button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </div>
  );
}
