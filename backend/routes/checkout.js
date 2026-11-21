const express = require("express");
const { getAuth } = require("@clerk/express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");
const { requireClerkUser } = require("../middleware/clerkAuth");
const { ensureCustomerForClerk } = require("../lib/customerAuth");

const router = express.Router();

const TICKET_PRICES = {
  Adult: 29.99,
  Child: 19.99,
  Senior: 24.99
};

async function insertProducts(connection, transactionId, productList) {
  for (const item of productList) {
    const productId = item.productId;
    const quantity = item.quantity;

    if (!productId || !quantity || quantity <= 0) {
      const err = new Error("Each product needs productId and quantity > 0");
      err.statusCode = 400;
      throw err;
    }

    const [productRows] = await connection.query(
      "SELECT Price, IsDeleted FROM product WHERE ProductID = ?",
      [productId]
    );

    if (productRows.length === 0 || productRows[0].IsDeleted === 1) {
      const err = new Error("Product not found");
      err.statusCode = 400;
      throw err;
    }

    await connection.query(
      `INSERT INTO transactionproduct (TransactionID, ProductID, Quantity, UnitPrice)
       VALUES (?, ?, ?, ?)`,
      [transactionId, productId, quantity, productRows[0].Price]
    );
  }
}

async function insertTickets(connection, transactionId, tickets) {
  const inserted = [];

  for (const line of tickets) {
    const type = line.type;
    const quantity = parseInt(line.quantity, 10);

    if (!type || !quantity || quantity <= 0) {
      const err = new Error("Each ticket needs type and quantity > 0");
      err.statusCode = 400;
      throw err;
    }

    const unitPrice = TICKET_PRICES[type];
    if (unitPrice == null) {
      const err = new Error("Ticket type must be Adult, Child, or Senior");
      err.statusCode = 400;
      throw err;
    }

    const [result] = await connection.query(
      `INSERT INTO ticket (TransactionID, Type, Quantity, UnitPrice)
       VALUES (?, ?, ?, ?)`,
      [transactionId, type, quantity, unitPrice]
    );

    inserted.push({
      ticketId: result.insertId,
      type,
      quantity,
      unitPrice
    });
  }

  return inserted;
}

async function insertVisitedEnclosures(connection, transactionId, enclosureIds) {
  const unique = [...new Set(enclosureIds.map((id) => parseInt(id, 10)).filter(Boolean))];

  for (const enclosureId of unique) {
    const [rows] = await connection.query(
      `SELECT e.EnclosureID, e.Name, COALESCE(o.IsOpenToday, 0) AS IsOpenToday
       FROM enclosure e
       LEFT JOIN v_enclosure_open_today o ON o.EnclosureID = e.EnclosureID
       WHERE e.EnclosureID = ?
         AND e.IsDeleted = 0
         AND e.HabitatType <> 'Medical'
         AND e.Name <> 'Quarantine Ward'`,
      [enclosureId]
    );
    if (rows.length === 0) {
      const err = new Error("Enclosure not found: " + enclosureId);
      err.statusCode = 400;
      throw err;
    }
    if (Number(rows[0].IsOpenToday) !== 1) {
      const err = new Error(rows[0].Name + " is closed today");
      err.statusCode = 400;
      throw err;
    }

    await connection.query(
      `INSERT INTO transaction_enclosure (TransactionID, EnclosureID)
       VALUES (?, ?)`,
      [transactionId, enclosureId]
    );
  }
}

async function getOnlineStoreId(connection) {
  const [rows] = await connection.query(
    "SELECT ShopID FROM shop WHERE ShopType = 'Online' AND IsDeleted = 0 ORDER BY ShopID LIMIT 1"
  );
  if (rows.length === 0) {
    const err = new Error("Online store is not set up");
    err.statusCode = 500;
    throw err;
  }
  return rows[0].ShopID;
}

async function rollbackQuietly(connection) {
  if (!connection) return;

  try {
    await connection.rollback();
  } catch (rollbackError) {
    console.error(rollbackError.message);
  } finally {
    connection.release();
  }
}

// POST /checkout
router.post("/checkout", requireClerkUser, async (req, res) => {
  let connection;

  try {
    const body = req.body;
    const productList = Array.isArray(body.products) ? body.products : [];
    const enclosureIds = Array.isArray(body.enclosureIds) ? body.enclosureIds : [];
    const tickets = Array.isArray(body.tickets) ? body.tickets : [];

    const customer = await ensureCustomerForClerk(getAuth(req));
    const customerId = customer.customerId;

    if (tickets.length === 0 && productList.length === 0) {
      return sendJson(res, 400, {
        error: "Add at least one ticket or product"
      });
    }

    if (tickets.length === 0 && enclosureIds.length > 0) {
      return sendJson(res, 400, {
        error: "Visiting enclosures requires a ticket"
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const shopId = await getOnlineStoreId(connection);

    const [txResult] = await connection.query(
      `INSERT INTO \`transaction\` (CustomerID, EmployeeID, ShopID, \`Date\`, PaymentType)
         VALUES (?, NULL, ?, NOW(), 'Card')`,
      [customerId, shopId]
    );

    const transactionId = txResult.insertId;

    const ticketRows =
      tickets.length > 0 ? await insertTickets(connection, transactionId, tickets) : [];

    if (productList.length > 0) {
      await insertProducts(connection, transactionId, productList);
    }

    if (enclosureIds.length > 0) {
      await insertVisitedEnclosures(connection, transactionId, enclosureIds);
    }

    await connection.commit();
    connection.release();

    return sendJson(res, 201, {
      transactionId,
      tickets: ticketRows,
      paymentType: "Card",
      message: "Purchase complete"
    });
  } catch (error) {
    await rollbackQuietly(connection);
    console.error(error.message);
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }
});

// GET /sales/today
router.get("/sales/today", async (req, res) => {
  try {
    const employeeId = req.staff?.employeeId || req.query.employeeId;
    if (!employeeId) {
      return sendJson(res, 400, { error: "Missing employeeId" });
    }

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS SaleCount, COALESCE(SUM(TotalAmount), 0) AS SalesTotal
        FROM v_transaction_totals
        WHERE EmployeeID = ?
        AND DATE(\`Date\`) = DATE(
          CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )`,
      [employeeId]
    );
    return sendJson(res, 200, {
      saleCount: Number(rows[0].SaleCount),
      salesTotal: Number(rows[0].SalesTotal)
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get today's sales" });
  }
});

// POST /sales
router.post("/sales", async (req, res) => {
  let connection;

  try {
    const body = req.body;
    const employeeId = req.staff?.employeeId || body.employeeId;
    const { shopId, paymentType } = body;
    const productList = Array.isArray(body.products) ? body.products : [];

    const receiptEmail = (body.customerEmail || "").trim().toLowerCase() || null;

    if (!employeeId || !shopId || !paymentType) {
      return sendJson(res, 400, { error: "Missing cashier, shop, or payment type" });
    }

    if (paymentType !== "Cash" && paymentType !== "Card") {
      return sendJson(res, 400, { error: "PaymentType must be Cash or Card" });
    }

    if (productList.length === 0) {
      return sendJson(res, 400, { error: "Add at least one product" });
    }

    if (receiptEmail) {
      if (receiptEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail)) {
        return sendJson(res, 400, { error: "Receipt email is not valid" });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [txResult] = await connection.query(
      `INSERT INTO \`transaction\` (CustomerID, EmployeeID, ShopID, \`Date\`, PaymentType, ReceiptEmail)
         VALUES (NULL, ?, ?, NOW(), ?, ?)`,
      [employeeId, shopId, paymentType, receiptEmail]
    );
    const transactionId = txResult.insertId;

    await insertProducts(connection, transactionId, productList);

    await connection.commit();
    connection.release();

    return sendJson(res, 201, {
      transactionId,
      paymentType,
      receiptEmail,
      message: "Sale recorded"
    });
  } catch (error) {
    await rollbackQuietly(connection);
    console.error(error.message);
    return sendJson(res, error.statusCode || 400, { error: error.message });
  }
});

module.exports = router;