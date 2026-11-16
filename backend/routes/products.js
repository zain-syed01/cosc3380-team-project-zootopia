const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

const CATEGORIES_BY_SHOP_TYPE = {
  Food: ["Food", "Drink"],
  Gift: ["Merchandise", "Apparel"],
  Online: ["Merchandise", "Apparel"]
};

async function checkCategory(category, shopId) {
  const [rows] = await pool.query(
    "SELECT ShopType FROM shop WHERE ShopID = ? AND IsDeleted = 0",
    [shopId]
  );
  if (rows.length === 0) return "Shop not found";
  const allowed = CATEGORIES_BY_SHOP_TYPE[rows[0].ShopType] || [];
  if (!allowed.includes(category)) {
    return rows[0].ShopType + " shops can only sell: " + allowed.join(", ");
  }
  return null;
}

// GET /search?q=shirt
router.get("/search", async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || !searchTerm.trim()) {
      return sendJson(res, 400, { error: "Search term is required" });
    }

    const term = `%${searchTerm.trim()}%`;

    const [rows] = await pool.query(
      `SELECT
           p.ProductID,
           p.Name AS ProductName,
           p.Category,
           p.Price,
           p.QuantityInStock,
           s.Name AS ShopName
         FROM product p
         JOIN shop s ON p.ShopID = s.ShopID
         WHERE p.IsDeleted = 0
           AND s.IsDeleted = 0
           AND (p.Name LIKE ? OR p.Category LIKE ? OR s.Name LIKE ?)
         ORDER BY p.Name`,
      [term, term, term]
    );

    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not search products" });
  }
});

// GET /  (optional ?shopId=2 or ?shopType=Online)
router.get("/", async (req, res) => {
  try {
    let sql = `SELECT p.*, s.Name AS ShopName, s.ShopType
                 FROM product p
                 JOIN shop s ON s.ShopID = p.ShopID
                 WHERE p.IsDeleted = 0 AND s.IsDeleted = 0`;
    const params = [];

    const { shopId, shopType } = req.query;
    if (shopId) {
      sql += " AND p.ShopID = ?";
      params.push(shopId);
    }
    if (shopType) {
      sql += " AND s.ShopType = ?";
      params.push(shopType);
    }

    sql += " ORDER BY p.Name";
    const [rows] = await pool.query(sql, params);
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get products" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM product WHERE ProductID = ? AND IsDeleted = 0",
      [id]
    );

    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Product not found" });
    }

    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get product" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { Name, Price, Category, QuantityInStock, ShopID } = body;

    if (!Name || Price == null || !Category || QuantityInStock == null || !ShopID) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const categoryError = await checkCategory(Category, ShopID);
    if (categoryError) {
      return sendJson(res, 400, { error: categoryError });
    }

    const [result] = await pool.query(
      `INSERT INTO product (Name, Price, Category, QuantityInStock, ShopID)
         VALUES (?, ?, ?, ?, ?)`,
      [Name, Price, Category, QuantityInStock, ShopID]
    );

    return sendJson(res, 201, { ProductID: result.insertId });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// PUT /:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const body = req.body;
    const { Name, Price, Category, QuantityInStock, ShopID } = body;

    if (!Name || Price == null || !Category || QuantityInStock == null || !ShopID) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const categoryError = await checkCategory(Category, ShopID);
    if (categoryError) {
      return sendJson(res, 400, { error: categoryError });
    }

    const [result] = await pool.query(
      `UPDATE product
         SET Name = ?, Price = ?, Category = ?, QuantityInStock = ?, ShopID = ?
         WHERE ProductID = ? AND IsDeleted = 0`,
      [Name, Price, Category, QuantityInStock, ShopID, id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Product not found" });
    }

    return sendJson(res, 200, { message: "Product updated" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE product SET IsDeleted = 1 WHERE ProductID = ? AND IsDeleted = 0",
      [id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Product not found" });
    }

    return sendJson(res, 200, { message: "Product deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete product" });
  }
});

module.exports = router;