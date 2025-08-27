import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import productsRoutes from "./routes/productRoutes";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));


app.use("/api/products", productsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
