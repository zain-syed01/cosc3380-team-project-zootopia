const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
           c.CustomerID,
           c.Email,
           u.Username,
           COALESCE(vs.LifetimeSpend, 0) AS LifetimeSpend,
           COALESCE(vs.TransactionCount, 0) AS TransactionCount
         FROM customer c
         LEFT JOIN users u ON u.CustomerID = c.CustomerID AND u.IsDeleted = 0
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
      `SELECT c.CustomerID, c.Email, u.Username
         FROM customer c
         LEFT JOIN users u ON u.CustomerID = c.CustomerID AND u.IsDeleted = 0
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

// POST /
router.post("/", async (req, res) => {
  let connection;
  try {
    const body = req.body;
    const email = (body.Email || "").trim();
    const username = (body.Username || "").trim();
    const password = body.Password;

    if (!email || !username || !password) {
      return sendJson(res, 400, { error: "Email, Username, and Password required" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [custResult] = await connection.query(
      "INSERT INTO customer (Email) VALUES (?)",
      [email]
    );
    const customerId = custResult.insertId;

    await connection.query(
      `INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
         VALUES (?, ?, 'Customer', NULL, ?)`,
      [username, password, customerId]
    );

    await connection.commit();
    connection.release();
    return sendJson(res, 201, { CustomerID: customerId });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (rollbackError) {
        console.error(rollbackError.message);
      }
    }
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// PUT /:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const body = req.body;
    const email = (body.Email || "").trim();
    if (!email) {
      return sendJson(res, 400, { error: "Email is required" });
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