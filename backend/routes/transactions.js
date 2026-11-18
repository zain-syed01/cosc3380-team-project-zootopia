const express = require("express");
const { getAuth, requireAuth } = require("@clerk/express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");
const { ensureCustomerForClerk } = require("../lib/customerAuth");

const router = express.Router();

async function loadTransactionDetail(transactionId, customerId) {
  const [txRows] = await pool.query(
    `SELECT
       t.TransactionID,
       t.CustomerID,
       t.Date,
       t.PaymentType,
       COALESCE(vt.TotalAmount, 0) AS TotalAmount
     FROM \`transaction\` t
     LEFT JOIN v_transaction_totals vt
       ON vt.TransactionID = t.TransactionID
     WHERE t.TransactionID = ?
       AND t.CustomerID = ?`,
    [transactionId, customerId]
  );

  if (txRows.length === 0) {
    return null;
  }

  const row = txRows[0];

  const [tickets] = await pool.query(
    `SELECT TicketID, Type, Quantity, UnitPrice
     FROM ticket
     WHERE TransactionID = ?
     ORDER BY TicketID`,
    [transactionId]
  );

  const [products] = await pool.query(
    `SELECT
       tp.ProductID,
       p.Name AS ProductName,
       tp.Quantity,
       tp.UnitPrice
     FROM transactionproduct tp
     JOIN product p ON p.ProductID = tp.ProductID
     WHERE tp.TransactionID = ?`,
    [transactionId]
  );

  const [enclosures] = await pool.query(
    `SELECT e.EnclosureID, e.Name AS EnclosureName
     FROM transaction_enclosure te
     JOIN enclosure e ON e.EnclosureID = te.EnclosureID
     WHERE te.TransactionID = ?`,
    [transactionId]
  );

  return {
    transactionId: row.TransactionID,
    customerId: row.CustomerID,
    date: row.Date,
    paymentType: row.PaymentType,
    tickets,
    products,
    enclosures,
    totalAmount: row.TotalAmount
  };
}

// GET /my/transactions/:id
router.get("/my/transactions/:id", requireAuth(), async (req, res) => {
  try {
    const customer = await ensureCustomerForClerk(getAuth(req));
    const detail = await loadTransactionDetail(req.params.id, customer.customerId);
    if (!detail) {
      return sendJson(res, 404, { error: "Transaction not found" });
    }
    return sendJson(res, 200, detail);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.message || "Could not get transaction"
    });
  }
});

// GET /my/transactions
router.get("/my/transactions", requireAuth(), async (req, res) => {
  try {
    const customer = await ensureCustomerForClerk(getAuth(req));

    const [transactions] = await pool.query(
      `SELECT
           t.TransactionID,
           t.CustomerID,
           t.Date,
           t.PaymentType,
           COALESCE(vt.TotalAmount, 0) AS TotalAmount,
           (
             SELECT COALESCE(SUM(tk.Quantity), 0)
             FROM ticket tk
             WHERE tk.TransactionID = t.TransactionID
           ) AS TicketCount,
           (
             SELECT COALESCE(SUM(tp.Quantity), 0)
             FROM transactionproduct tp
             WHERE tp.TransactionID = t.TransactionID
           ) AS ProductCount
         FROM \`transaction\` t
         LEFT JOIN v_transaction_totals vt
           ON vt.TransactionID = t.TransactionID
         WHERE t.CustomerID = ?
         ORDER BY t.Date DESC`,
      [customer.customerId]
    );

    const result = transactions.map((row) => ({
      transactionId: row.TransactionID,
      customerId: row.CustomerID,
      date: row.Date,
      paymentType: row.PaymentType,
      ticketCount: row.TicketCount,
      productCount: row.ProductCount,
      totalAmount: row.TotalAmount
    }));

    return sendJson(res, 200, result);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.message || "Could not get transactions"
    });
  }
});

module.exports = router;
