
export type PriceLike = {
  amount?: number;             
  centAmount?: number;         
  currency: string;        
  fractionDigits?: number;    
};

export function formatPrice(
  price: PriceLike,
  locale: string = "en-US"
): string {
  const fraction = price.fractionDigits ?? 2;

  const value =
    typeof price.centAmount === "number"
      ? price.centAmount / Math.pow(10, fraction)
      : (price.amount ?? 0);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency,
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(value);
}
