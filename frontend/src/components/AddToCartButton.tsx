"use client";

import { useState } from "react";

type Props = {
  productId: string;
  name: string;
  priceText: string; 
  quantity: number;
  className?: string;
};

export default function AddToCartButton({
  productId,
  name,
  priceText,
  quantity,
  className = "",
}: Props) {
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const onAdd = () => {
    if (adding) return;
    setAdding(true);

    const key = "demo-cart";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = existing.findIndex((x: any) => x.id === productId);
    if (idx >= 0) existing[idx].qty += quantity;
    else existing.push({ id: productId, name, price: priceText, qty: quantity });
    localStorage.setItem(key, JSON.stringify(existing));

    setAdding(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={adding}
      className={`rounded-xl px-5 py-2.5 font-semibold text-white shadow-lg transition ${
        justAdded
          ? "bg-green-500 hover:bg-green-600"
          : "bg-pink-600 hover:bg-indigo-700"
      } disabled:opacity-60 ${className}`}
      aria-live="polite"
    >
      {justAdded ? "Added!" : adding ? "Adding…" : "Add to Cart"}
    </button>
  );
}

