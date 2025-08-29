"use client";
import Link from "next/link";

export default function ViewCartButton() {
  return (
    <Link
      href="/cart"
      className="
        fixed bottom-6 right-6 rounded-full px-6 py-3
        bg-indigo-600 text-white text-base font-semibold shadow-lg flex items-center gap-2
        transition hover:bg-indigo-700 focus:ring-2 focus:ring-pink-400
      "
    >
      <span>View Cart</span>
    </Link>
  );
}
