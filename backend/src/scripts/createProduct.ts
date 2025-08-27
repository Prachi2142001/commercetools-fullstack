// src/scripts/createProduct.ts
import "dotenv/config";
import { createProduct, type ProductTypeConfig } from "../services/productService";

function uniqSuffix() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

async function main() {
  const locale = "en-US";
  const suffix = uniqSuffix();

  // Use the existing product type’s brand enum keys: google | apple | samsung
  const electronicsTypeV3: ProductTypeConfig = {
    key: "electronics-type-v3",
    attributes: [
      // Keep SameForAll in our app logic; CT won't change attributeConstraint if it already exists.
      { name: "brand", type: "enum", sameForAll: true, values: [
        { key: "google",  label: "Google"  },
        { key: "apple",   label: "Apple"   },
        { key: "samsung", label: "Samsung" },
      ]},
      { name: "model", type: "text", sameForAll: true, searchable: true },
      { name: "warrantyYears", type: "number", sameForAll: true },

      // Variant-level
      {
        name: "color",
        type: "enum",
        values: [
          { key: "black",  label: "Black"  },
          { key: "white",  label: "White"  },
          { key: "blue",   label: "Blue"   },
          { key: "silver", label: "Silver" },
          { key: "gray",   label: "Gray"   },
        ],
      },
      {
        name: "storage",
        type: "enum",
        values: [
          { key: "64gb",  label: "64 GB"  },
          { key: "128gb", label: "128 GB" },
          { key: "256gb", label: "256 GB" },
          { key: "512gb", label: "512 GB" },
        ],
      },
      { name: "is5g", type: "boolean" },
    ],
  };

  // ---------- Product 1: Smartphone (brand = google) ----------
  const smartphone = {
    name: "Smartphone Alpha",
    slug: `smartphone-alpha-${suffix}`,
    description: "A sleek 5G smartphone with long battery life.",
    locale,
    currencyCode: "USD",
    centAmount: 49900,
    sku: `PHONE-ALPHA-${suffix}`,
    key: `prod-smartphone-alpha-${suffix}`,
    productTypeConfig: electronicsTypeV3,

    // SameForAll attributes must be present on master
    attributes: {
      brand: "google",       // enum key from allowed set
      model: "Alpha",
      warrantyYears: 2,

      // master’s own variant attributes:
      color: "black",
      storage: "128gb",
      is5g: true,
    },

    publish: true,

    variants: [
      {
        sku: `PHONE-ALPHA-BLUE-${suffix}`,
        attributes: {
          color: "blue",
          storage: "128gb",
          is5g: true,
        },
        centAmount: 49900,
        currencyCode: "USD",
        images: [
          { url: "https://images.example.com/alpha-blue-front.jpg", w: 800, h: 800 },
        ],
      },
      {
        sku: `PHONE-ALPHA-WHITE-${suffix}`,
        attributes: {
          color: "white",
          storage: "256gb",
          is5g: true,
        },
        centAmount: 54900,
        currencyCode: "USD",
        images: [
          { url: "https://images.example.com/alpha-white-front.jpg", w: 800, h: 800 },
        ],
      },
    ],
  };

  // ---------- Product 2: Laptop (brand = apple) ----------
  const laptop = {
    name: "Laptop Nova",
    slug: `laptop-nova-${suffix}`,
    description: "Lightweight laptop with powerful performance.",
    locale,
    currencyCode: "USD",
    centAmount: 119900,
    sku: `LAPTOP-NOVA-${suffix}`,
    key: `prod-laptop-nova-${suffix}`,
    productTypeConfig: electronicsTypeV3,

    attributes: {
      brand: "apple",        // enum key from allowed set
      model: "Nova 14",
      warrantyYears: 1,
      color: "silver",
      storage: "256gb",
      is5g: false,
    },

    publish: true,

    variants: [
      {
        sku: `LAPTOP-NOVA-GRAY-512-${suffix}`,
        attributes: {
          color: "gray",
          storage: "512gb",
          is5g: false,
        },
        centAmount: 139900,
        currencyCode: "USD",
        images: [
          { url: "https://images.example.com/nova-gray-512.jpg", w: 1200, h: 800 },
        ],
      },
    ],
  };

  try {
    const p1 = await createProduct(smartphone);
    const cur1 = p1?.masterData?.current;
    const shown1 = cur1?.name?.[locale] || Object.values(cur1?.name || {})[0];
    console.log(`Created: ${shown1} (id: ${p1.id})`);
  } catch (e: any) {
    console.error("Failed to create Smartphone Alpha:", e?.message || e);
  }

  try {
    const p2 = await createProduct(laptop);
    const cur2 = p2?.masterData?.current;
    const shown2 = cur2?.name?.[locale] || Object.values(cur2?.name || {})[0];
    console.log(`Created: ${shown2} (id: ${p2.id})`);
  } catch (e: any) {
    console.error("Failed to create Laptop Nova:", e?.message || e);
  }
}

main().catch((err) => {
  console.error("Seeding failed:", err?.message || err);
  process.exit(1);
});
