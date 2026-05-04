import mongoose from "mongoose";
import Stock from "../models/stock.models.js";

const STOCK_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s.'&()-]{0,79}$/;

const normalizeStockPayload = (body = {}) => ({
  stockname: typeof body.stockname === "string" ? body.stockname.trim() : "",
  quantity: Number(body.quantity),
  buy_price: Number(body.buy_price),
  current_price: Number(body.current_price)
});

const validateStockPayload = ({ stockname, quantity, buy_price, current_price }) => {
  if (!stockname || Number.isNaN(quantity) || Number.isNaN(buy_price) || Number.isNaN(current_price)) {
    return "Stock name, quantity, buy price, and current price are required";
  }

  if (!STOCK_NAME_REGEX.test(stockname)) {
    return "Stock name must be 1-80 characters and can include letters, numbers, spaces, dots, apostrophes, ampersands, parentheses, or hyphens";
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return "Quantity must be a whole number greater than 0";
  }

  if (buy_price < 0 || current_price < 0) {
    return "Buy price and current price cannot be negative";
  }

  return "";
};

const listStocksForUser = async (userId) => (
  Stock.find({ user: userId }).sort({ createdAt: -1 })
);

export const addStock = async (req, res) => {
  try {
    const userId = req.user?.id;
    const payload = normalizeStockPayload(req.body);
    const validationMessage = validateStockPayload(payload);

    if (!userId) {
      return res.status(401).json({ message: "Login required before saving stocks" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user session" });
    }

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const savedStock = await Stock.create({
      user: userId,
      ...payload
    });

    return res.status(201).json({
      success: true,
      message: "Stock added successfully",
      data: savedStock
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getMyStocks = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Login required before loading stocks" });
    }

    const stocks = await listStocksForUser(userId);
    return res.status(200).json(stocks);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const getStocks = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (req.user?.id !== requestedUserId) {
      return res.status(403).json({ message: "You can only load your own portfolio" });
    }

    const stocks = await listStocksForUser(requestedUserId);
    return res.status(200).json(stocks);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// --- YAHAN NAYA SELL (DELETE) LOGIC ADD KIYA HAI ---
export const deleteStock = async (req, res) => {
  try {
    const stockId = req.params.id;
    const userId = req.user?.id;

    // 1. Check if user is logged in
    if (!userId) {
      return res.status(401).json({ message: "Login required to sell stocks" });
    }

    // 2. Validate the stock ID format
    if (!mongoose.Types.ObjectId.isValid(stockId)) {
      return res.status(400).json({ message: "Invalid stock ID" });
    }

    // 3. Find the stock and delete it (Ensure it belongs to the logged-in user)
    const deletedStock = await Stock.findOneAndDelete({ _id: stockId, user: userId });

    // 4. If no stock was found, it might belong to someone else or already be deleted
    if (!deletedStock) {
      return res.status(404).json({ message: "Stock not found or you don't have permission to sell it" });
    }

    return res.status(200).json({ 
      success: true, 
      message: "Stock sold successfully", 
      data: deletedStock 
    });
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};