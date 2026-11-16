const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

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

// GET /my/transactions
router.get("/my/transactions", async (req, res) => {
  try {
    const customerId = req.query.customerId;

    if (!customerId) {
      return sendJson(res, 400, { error: "customerId is required" });
    }

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
      [customerId]
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
    return sendJson(res, 500, { error: "Could not get transactions" });
  }
});

// GET /my/transactions/:id
router.get("/my/transactions/:id", async (req, res) => {
  const { id: detailId } = req.params;
  try {
    const customerId = req.query.customerId;
    if (!customerId) {
      return sendJson(res, 400, { error: "customerId is required" });
    }

    const detail = await loadTransactionDetail(detailId, customerId);
    if (!detail) {
      return sendJson(res, 404, { error: "Transaction not found" });
    }
    return sendJson(res, 200, detail);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get transaction" });
  }
});

module.exports = router;