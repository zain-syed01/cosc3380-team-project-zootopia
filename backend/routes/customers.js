const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");
const { findStaffByEmail } = require("../lib/customerAuth");

const router = express.Router();

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
           c.CustomerID,
           c.Email,
           c.ClerkUserId,
           COALESCE(vs.LifetimeSpend, 0) AS LifetimeSpend,
           COALESCE(vs.TransactionCount, 0) AS TransactionCount
         FROM customer c
         LEFT JOIN v_customer_spending vs ON vs.CustomerID = c.CustomerID
         WHERE c.IsDeleted = 0
         ORDER BY c.Email`
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get customers" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT c.CustomerID, c.Email, c.ClerkUserId
         FROM customer c
         WHERE c.CustomerID = ? AND c.IsDeleted = 0`,
      [id]
    );
    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Customer not found" });
    }
    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get customer" });
  }
});

// POST / — managers can pre-create a customer email; the person still signs in with Clerk
router.post("/", async (req, res) => {
  try {
    const email = String(req.body.Email || "").trim().toLowerCase();
    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
    }

    if (await findStaffByEmail(email)) {
      return sendJson(res, 400, {
        error: "That email belongs to a staff account"
      });
    }

    const [result] = await pool.query(
      "INSERT INTO customer (Email) VALUES (?)",
      [email]
    );
    return sendJson(res, 201, { CustomerID: result.insertId });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// PUT /:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const email = String(req.body.Email || "").trim().toLowerCase();
    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
    }

    if (await findStaffByEmail(email)) {
      return sendJson(res, 400, {
        error: "That email belongs to a staff account"
      });
    }

    const [result] = await pool.query(
      "UPDATE customer SET Email = ? WHERE CustomerID = ? AND IsDeleted = 0",
      [email, id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Customer not found" });
    }
    return sendJson(res, 200, { message: "Customer updated" });
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
      "UPDATE customer SET IsDeleted = 1 WHERE CustomerID = ? AND IsDeleted = 0",
      [id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Customer not found" });
    }
    await pool.query(
      "UPDATE users SET IsDeleted = 1 WHERE CustomerID = ? AND IsDeleted = 0",
      [id]
    );
    return sendJson(res, 200, { message: "Customer deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete customer" });
  }
});

module.exports = router;
