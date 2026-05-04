import express from "express";
// DHYAN DEIN: Yahan deleteStock ko import karna zaroori hai
import { addStock, getMyStocks, getStocks, deleteStock } from "../controllers/stock.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, addStock);
router.get("/me", requireAuth, getMyStocks);
router.get("/:userId", requireAuth, getStocks);

// DHYAN DEIN: Yahan DELETE route add kiya gaya hai
router.delete("/:id", requireAuth, deleteStock);

export default router;