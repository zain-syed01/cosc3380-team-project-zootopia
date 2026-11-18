const express = require("express");
const { getAuth, requireAuth } = require("@clerk/express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");
const { verifyPassword } = require("../lib/password");
const { signStaffToken, STAFF_ROLES } = require("../middleware/auth");
const { ensureCustomerForClerk } = require("../lib/customerAuth");

const router = express.Router();

// POST /login — staff dashboard login
router.post("/login", async (req, res) => {
  try {
    const body = req.body;
    const username = (body.username || "").trim();
    const password = body.password;

    if (!username || !password) {
      return sendJson(res, 400, { error: "Username and password required" });
    }

    const [rows] = await pool.query(
      `SELECT u.UserID, u.Username, u.Password, u.Role, u.EmployeeID, u.CustomerID
         FROM users u
         LEFT JOIN employee e ON u.EmployeeID = e.EmployeeID
         WHERE u.Username = ?
           AND u.IsDeleted = 0
           AND u.EmployeeID IS NOT NULL
           AND e.IsDeleted = 0`,
      [username]
    );

    if (rows.length === 0) {
      return sendJson(res, 401, { error: "Invalid username or password" });
    }

    const user = rows[0];
    const ok = await verifyPassword(password, user.Password);
    if (!ok) {
      return sendJson(res, 401, { error: "Invalid username or password" });
    }

    if (!STAFF_ROLES.includes(user.Role)) {
      return sendJson(res, 403, {
        error: "Customers should use the customer sign in page."
      });
    }

    const token = signStaffToken(user);
    return sendJson(res, 200, {
      token,
      username: user.Username,
      role: user.Role,
      employeeId: user.EmployeeID
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Login failed" });
  }
});

// POST /auth/clerk/sync — create/link a customer row for the Clerk user
router.post("/auth/clerk/sync", requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const customer = await ensureCustomerForClerk(auth);
    return sendJson(res, 200, customer);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.message || "Could not sync customer account"
    });
  }
});

// GET /auth/clerk/me
router.get("/auth/clerk/me", requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const customer = await ensureCustomerForClerk(auth);
    return sendJson(res, 200, customer);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.message || "Could not load customer account"
    });
  }
});

module.exports = router;
