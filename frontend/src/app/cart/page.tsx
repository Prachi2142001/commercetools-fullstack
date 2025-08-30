"use client";

import { useEffect, useState } from "react";
import {
  getCart,
  applyPromo,
  removePromo,
  updateLineItemQuantity,
  removeLineItem,
  setCartAddress,
  getShippingMethods,
  chooseShippingMethod,
  getCartTotals,
} from "@/lib/cart-client";
import { formatPrice } from "@/lib/price-format";
import type { Cart, Money } from "@/types/cart-types";
import QuantityStepper from "@/components/QuantityStepper";

function money(m?: Money | null) {
  if (!m) return "—";
  return formatPrice(
    {
      centAmount: m.centAmount,
      currency: m.currencyCode,
      fractionDigits: m.fractionDigits ?? 2,
    },
    "en-US"
  );
}

type Notice = { type: "success" | "error"; text: string } | null;

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [code, setCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [itemLoadingId, setItemLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Notice>(null);
  const [addr, setAddr] = useState({
    firstName: "Prachi",
    lastName: "Birla",
    streetName: "Market Street 24",
    postalCode: "94103",
    city: "San Francisco",
    country: "US",
  });
  const [methods, setMethods] = useState<
    {
      id: string;
      name: string;
      description?: any;
      price?: Money | null;
      matchesCart?: boolean;
    }[]
  >([]);
  const [chosenMethodId, setChosenMethodId] = useState<string>("");
  const [totals, setTotals] = useState<{
    currency?: string;
    subtotal?: Money | null;
    shipping?: Money | null;
    tax?: Money | null;
    total?: Money | null;
  } | null>(null);
  const [shipLoading, setShipLoading] = useState(false);

  async function refresh() {
    const c = await getCart();
    setCart(c);
    try {
      const t = await getCartTotals();
      setTotals(t);
    } catch {}
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  async function onApply() {
    if (!code.trim()) return;
    try {
      setPromoLoading(true);
      await applyPromo(code.trim());
      setCode("");
      await refresh();
      setMsg({ type: "success", text: "Promo code applied successfully." });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to apply code." });
    } finally {
      setPromoLoading(false);
    }
  }

  async function onRemove(codeId: string) {
    try {
      setPromoLoading(true);
      await removePromo(codeId);
      await refresh();
      setMsg({ type: "success", text: "Promo code removed." });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to remove code." });
    } finally {
      setPromoLoading(false);
    }
  }

  async function onChangeQty(lineItemId: string, quantity: number) {
    try {
      setItemLoadingId(lineItemId);
      if (quantity <= 0) {
        await removeLineItem(lineItemId);
      } else {
        await updateLineItemQuantity({ lineItemId, quantity });
      }
      await refresh();
    } catch (e: any) {
      setMsg({
        type: "error",
        text: e?.message || "Failed to update quantity.",
      });
    } finally {
      setItemLoadingId(null);
    }
  }

  async function onRemoveLine(lineItemId: string) {
    try {
      setItemLoadingId(lineItemId);
      await removeLineItem(lineItemId);
      await refresh();
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to remove item." });
    } finally {
      setItemLoadingId(null);
    }
  }

  async function onSaveAddress() {
    try {
      setShipLoading(true);
      await setCartAddress(addr);
      const m = await getShippingMethods();
      setMethods(m);
      if (m?.length) setChosenMethodId(m[0].id);
      setTotals(await getCartTotals());
      setMsg({ type: "success", text: "Address saved." });
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Failed to save address." });
    } finally {
      setShipLoading(false);
    }
  }

  async function onChooseMethod() {
    if (!chosenMethodId) return;
    try {
      setShipLoading(true);
      await chooseShippingMethod(chosenMethodId);
      setTotals(await getCartTotals());
      setMsg({ type: "success", text: "Shipping method set." });
    } catch (e: any) {
      setMsg({
        type: "error",
        text:
          e?.message ||
          "Failed to set shipping method. Make sure you pick one that matches the cart.",
      });
    } finally {
      setShipLoading(false);
    }
  }

  if (!cart)
    return (
      <main className="min-h-[65vh] flex items-center justify-center bg-gray-50 px-2">
        <div className="text-lg text-gray-600">Loading…</div>
      </main>
    );

  const originalSubtotalCents =
    cart?.lineItems?.reduce((sum, li) => {
      const lineTotal = li.price?.value?.centAmount ?? 0;
      return sum + lineTotal * (li.quantity ?? 1);
    }, 0) ?? 0;

  const originalSubtotal: Money = {
    centAmount: originalSubtotalCents,
    currencyCode: cart?.totalPrice?.currencyCode || "USD",
    fractionDigits: cart?.totalPrice?.fractionDigits ?? 2,
  };

  const discountCents =
    (cart as any).discountOnTotalPrice?.discountedAmount?.centAmount ?? 0;


  const discountedTotal: Money = discountCents
    ? {
        centAmount: originalSubtotalCents - discountCents,
        currencyCode: originalSubtotal.currencyCode,
        fractionDigits: originalSubtotal.fractionDigits,
      }
    : originalSubtotal;

  const discountApplied = discountCents > 0;

  const shipping: Money = totals?.shipping || {
    centAmount: 0,
    currencyCode: originalSubtotal.currencyCode,
    fractionDigits: originalSubtotal.fractionDigits,
  };

  const tax: Money = totals?.tax || {
    centAmount: 0,
    currencyCode: originalSubtotal.currencyCode,
    fractionDigits: originalSubtotal.fractionDigits,
  };

  const orderTotal: Money = {
    centAmount:
      discountedTotal.centAmount +
      (shipping.centAmount ?? 0) +
      (tax.centAmount ?? 0),
    currencyCode: originalSubtotal.currencyCode,
    fractionDigits: originalSubtotal.fractionDigits,
  };

  const hasShippingMethod = !!cart?.shippingInfo;

  return (
    <main className="flex items-center justify-center min-h-[65vh] py-8 px-2">
      <div className="w-full max-w-3xl p-4 sm:p-8 rounded-2xl shadow-2xl bg-white/90 space-y-8 relative z-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-indigo-900 tracking-tight mb-2">
          Your Cart
        </h1>
        <div className="space-y-4">
          {cart.lineItems?.map((li) => {
            const qty = li.quantity ?? 1;
            const unit = li.price?.value;
            const total = li.totalPrice;
            const originalTotal: Money | undefined = unit
              ? {
                  centAmount: (unit.centAmount ?? 0) * qty,
                  currencyCode: unit.currencyCode,
                  fractionDigits: unit.fractionDigits ?? 2,
                }
              : undefined;
            const lineDiscount =
              !!originalTotal &&
              !!total &&
              total.centAmount < originalTotal.centAmount;

            return (
              <div
                key={li.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 border rounded-xl p-4 shadow-sm bg-white/80 transition-all hover:shadow-md"
              >
                <div className="flex flex-1 flex-col space-y-2">
                  <div className="font-semibold text-lg text-indigo-800">
                    {li.name?.["en-US"] || li.productKey || li.productId}
                  </div>
                  <div className="text-sm text-gray-500">Qty {qty}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <QuantityStepper
                      value={qty}
                      onChange={(next) => onChangeQty(li.id, next)}
                      min={1}
                      disabled={itemLoadingId === li.id}
                    />
                    <button
                      onClick={() => onRemoveLine(li.id)}
                      disabled={itemLoadingId === li.id}
                      className="cursor-pointer ml-2 text-pink-600 text-sm underline hover:opacity-70 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-right min-w-[100px]">
                  {lineDiscount && (
                    <div className="line-through text-gray-500">
                      {money(originalTotal)}
                    </div>
                  )}
                  <div className="font-bold text-pink-700 text-xl">
                    {money(total ?? originalTotal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary: Subtotal and Total */}
        <div className="border rounded-xl p-4 sm:p-6 bg-white/80 space-y-3 shadow-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            {discountApplied ? (
              <span className="line-through text-gray-400 font-medium">
                {money(originalSubtotal)}
              </span>
            ) : (
              <span>{money(originalSubtotal)}</span>
            )}
          </div>

          <div className="flex justify-between font-extrabold text-lg">
            <span>Total</span>
            <span className="text-indigo-900">{money(discountedTotal)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-start">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter promo code (e.g., Welcome10)"
            className="border rounded-md px-3 py-2 w-44 sm:w-64 focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm"
            disabled={promoLoading}
          />
          <button
            onClick={onApply}
            disabled={promoLoading || !code.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md font-semibold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {promoLoading ? "Applying…" : "Apply"}
          </button>
          {(cart.discountCodes ?? []).map((codes) => {
            const dc: any = codes.discountCode as any;
            const dcId: string = dc?.id;
            const label: string = dc?.obj?.code ?? "Promo applied";
            return (
              <div key={dcId} className="flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-900 shadow">
                  {label}
                </span>
                <button
                  onClick={() => onRemove(dcId)}
                  disabled={promoLoading}
                  className="bg-gray-200 text-gray-900 px-3 py-2 rounded-md text-sm hover:bg-gray-300 transition-colors shadow disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="border rounded-2xl p-4 sm:p-6 bg-white/90 shadow space-y-4">
          <h2 className="text-lg font-bold text-indigo-800">
            Shipping & Taxes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="First name"
              value={addr.firstName}
              onChange={(e) =>
                setAddr((a) => ({ ...a, firstName: e.target.value }))
              }
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Last name"
              value={addr.lastName}
              onChange={(e) =>
                setAddr((a) => ({ ...a, lastName: e.target.value }))
              }
            />
            <input
              className="border rounded px-3 py-2 sm:col-span-2"
              placeholder="Street"
              value={addr.streetName}
              onChange={(e) =>
                setAddr((a) => ({ ...a, streetName: e.target.value }))
              }
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Postal code"
              value={addr.postalCode}
              onChange={(e) =>
                setAddr((a) => ({ ...a, postalCode: e.target.value }))
              }
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="City"
              value={addr.city}
              onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Country (US)"
              value={addr.country}
              onChange={(e) =>
                setAddr((a) => ({
                  ...a,
                  country: e.target.value.toUpperCase(),
                }))
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSaveAddress}
              disabled={shipLoading}
              className="bg-gray-900 text-white px-4 py-2 rounded-md shadow hover:opacity-90 disabled:opacity-60"
            >
              {shipLoading ? "Saving…" : "Save address"}
            </button>
            {methods.length > 0 && (
              <>
                <select
                  className="border rounded px-3 py-2"
                  value={chosenMethodId}
                  onChange={(e) => setChosenMethodId(e.target.value)}
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.matchesCart === false ? " (not eligible)" : ""} —{" "}
                      {m.price ? money(m.price as any) : "—"}
                    </option>
                  ))}
                </select>
                <button
                  onClick={onChooseMethod}
                  disabled={!chosenMethodId || shipLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow hover:bg-indigo-700 disabled:opacity-60"
                >
                  {shipLoading ? "Setting…" : "Set shipping method"}
                </button>
              </>
            )}
          </div>

          <div className="mt-2 border rounded-xl p-4 bg-white/80 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(discountedTotal)}</span>
            </div>
            {hasShippingMethod && (
              <>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{money(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>{money(tax)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between font-bold text-lg">
              <span>Order Total</span>
              <span className="text-indigo-900">{money(orderTotal)}</span>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`text-sm px-3 py-2 mt-2 rounded-md absolute top-4 right-4 z-10 shadow-md transition-all ${
              msg.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {msg.text}
          </div>
        )}
      </div>
    </main>
  );
}
