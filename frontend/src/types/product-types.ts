
export type MoneyView = {
  currencyCode: string;
  amount: number;
  centAmount: number;
  fractionDigits: number;
};

export type PriceView = {
  price: MoneyView | null;
  discounted?: MoneyView | null;
};

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  thumbnail?: string;
  variantId: number;
  sku?: string;
  price: PriceView;
};

export type VariantView = {
  id: number;
  sku?: string;
  images: string[];
  price: PriceView;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  masterVariant: VariantView;
  variants: VariantView[];
};
