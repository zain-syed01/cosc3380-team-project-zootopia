const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

const SHOP_TYPES = ["Gift", "Food", "Online"];
const LOCATIONS = ["Zone A", "Zone B", "Zone C", "Main Plaza", "Vet Wing"];

function fixLocation(shopType, location) {
  if (shopType === "Online") return { location: "Online" };
  if (!LOCATIONS.includes(location)) {
    return { error: "Location must be one of: " + LOCATIONS.join(", ") };
  }
  return { location };
}

async function checkShopType(shopType, currentShopId) {
  if (!SHOP_TYPES.includes(shopType)) {
    return "ShopType must be Gift, Food, or Online";
  }

  const [rows] = await pool.query(
    "SELECT ShopID, ShopType FROM shop WHERE IsDeleted = 0"
  );

  const onlineStore = rows.find((s) => s.ShopType === "Online");
  const current = rows.find((s) => String(s.ShopID) === String(currentShopId));

  if (shopType === "Online" && onlineStore && String(onlineStore.ShopID) !== String(currentShopId)) {
    return "There is already an online store";
  }
  if (current && current.ShopType === "Online" && shopType !== "Online") {
    return "The online store's type can't be changed";
  }
  return null;
}

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM shop WHERE IsDeleted = 0"
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get shops" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM shop WHERE ShopID = ? AND IsDeleted = 0",
      [id]
    );

    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Shop not found" });
    }

    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get shop" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { Name, Location, ShopType } = body;

    if (!Name || !ShopType || (!Location && ShopType !== "Online")) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const typeError = await checkShopType(ShopType, null);
    if (typeError) {
      return sendJson(res, 400, { error: typeError });
    }

    const loc = fixLocation(ShopType, Location);
    if (loc.error) {
      return sendJson(res, 400, { error: loc.error });
    }

    const [result] = await pool.query(
      "INSERT INTO shop (Name, Location, ShopType) VALUES (?, ?, ?)",
      [Name, loc.location, ShopType]
    );

    return sendJson(res, 201, { ShopID: result.insertId });
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
    const { Name, Location, ShopType } = body;

    if (!Name || !ShopType || (!Location && ShopType !== "Online")) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const typeError = await checkShopType(ShopType, id);
    if (typeError) {
      return sendJson(res, 400, { error: typeError });
    }

    const loc = fixLocation(ShopType, Location);
    if (loc.error) {
      return sendJson(res, 400, { error: loc.error });
    }

    const [result] = await pool.query(
      `UPDATE shop
         SET Name = ?, Location = ?, ShopType = ?
         WHERE ShopID = ? AND IsDeleted = 0`,
      [Name, loc.location, ShopType, id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Shop not found" });
    }

    return sendJson(res, 200, { message: "Shop updated" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [shopRows] = await pool.query(
      "SELECT ShopType FROM shop WHERE ShopID = ? AND IsDeleted = 0",
      [id]
    );
    if (shopRows.length > 0 && shopRows[0].ShopType === "Online") {
      return sendJson(res, 400, { error: "The online store can't be deleted" });
    }

    const [result] = await pool.query(
      "UPDATE shop SET IsDeleted = 1 WHERE ShopID = ? AND IsDeleted = 0",
      [id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Shop not found" });
    }

    await pool.query(
      "UPDATE product SET IsDeleted = 1 WHERE ShopID = ? AND IsDeleted = 0",
      [id]
    );

    return sendJson(res, 200, { message: "Shop deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete shop" });
  }
});

module.exports = router;