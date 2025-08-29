import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import productsRoutes from "./routes/productRoutes";  
import storefrontProducts from "./routes/getProducts";
import cartRoutes from "./routes/cartRoutes";   
import cookieParser from "cookie-parser";


const app = express();

app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true })); 
app.use(express.json());


app.get("/health", (_req, res) => res.json({ status: "ok" }));


app.use("/api/products", productsRoutes);
app.use("/api/storefront/products", storefrontProducts);


app.use("/api/storefront", cartRoutes); 

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    exposedHeaders: ["x-cart-id"], 
  })
);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
