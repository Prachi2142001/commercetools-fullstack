import "dotenv/config";
import { createProduct } from "../services/productService";

async function main() {
  const payloads = [
    {
      name: "iPhone 15",
      currencyCode: "USD",
      centAmount: 79900,
      sku: "IPHONE15-BLK-128",
      key: "prod-iphone15",
      productTypeConfig: {
        key: "mobile-type-v1",
        attributes: [
          {
            name: "brand",
            type: "enum",
            values: [
              { key: "apple", label: "Apple" },
              { key: "samsung", label: "Samsung" },
            ],
          },
          { name: "model", type: "text" },
          {
            name: "storage",
            type: "enum",
            values: [
              { key: "128gb", label: "128 GB" },
              { key: "256gb", label: "256 GB" },
            ],
          },
          {
            name: "color",
            type: "enum",
            values: [
              { key: "black", label: "Black" },
              { key: "blue", label: "Blue" },
            ],
          },
        ],
      },
      attributes: {
        brand: "apple",
        model: "iPhone 15",
        storage: "128gb",
        color: "black",
      },
      variants: [
        {
          sku: "IPHONE15-BLK-256",
          attributes: {
            brand: "apple",
            model: "iPhone 15",
            storage: "256gb",
            color: "black",
          },
        },
      ],
    },
  ];

  for (const p of payloads) {
    const created = await createProduct(p as any);
    console.log(`Created: ${created?.masterData?.current?.name?.en}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err?.message ?? err);
});
