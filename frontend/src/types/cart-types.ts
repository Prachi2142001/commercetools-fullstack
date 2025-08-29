export type Money = {
  centAmount: number;
  currencyCode: string;
  fractionDigits?: number;
};

export type LineItem = {
  id: string;
  productId: string;
  productKey?: string;
  name?: Record<string, string>;
  quantity: number;
  price?: { value?: Money; discounted?: { value: Money } };
  totalPrice?: Money;
};

export type DiscountCodeInfo = {
  discountCode: { id: string; typeId: "discount-code" };
  state: "NotActive" | "NotValid" | "DoesNotMatchCart" | "MatchesCart" | string;
};

export type Cart = {
  id: string;
  version: number;
  lineItems: LineItem[];
  discountCodes?: DiscountCodeInfo[];
  totalPrice?: Money;
};
