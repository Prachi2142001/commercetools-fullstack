import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import productsRoutes from "./routes/productRoutes";   // your existing admin (create/publish)
import storefrontProducts from "./routes/getProducts"; // NEW: listing + detail (GET)

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Admin routes (create/publish etc.)
app.use("/api/products", productsRoutes);

// Storefront read routes (listing + detail)
app.use("/api/storefront/products", storefrontProducts);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
