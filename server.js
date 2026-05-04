import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors"; 
import connectDB from "./config/db.js";
import userRoutes from "./routes/user.routes.js";
import stockRoutes from "./routes/stock.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const publicDir = path.join(__dirname, "public");

// 1. SABSE PEHLE CORS AAYEGA (Nuclear Option - Sab allow kar do)
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
})); 

// 2. USKE BAAD JSON PARSER
app.use(express.json());
app.use(express.static(publicDir));

// 3. DATABASE CONNECTION
connectDB();

// 4. SABSE AAKHIR MEIN ROUTES
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API is running successfully" });
});

app.use("/api/users", userRoutes);
app.use("/api/stocks", stockRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});