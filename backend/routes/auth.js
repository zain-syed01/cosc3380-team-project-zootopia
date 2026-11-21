const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");
const { hashPassword, verifyPassword } = require("../lib/password");
const {
  signStaffToken,
  signCustomerToken,
  STAFF_ROLES
} = require("../middleware/auth");
const { findStaffByEmail } = require("../lib/customerAuth");

const router = express.Router();

// POST /login — staff or customer (role decides JWT type)
router.post("/login", async (req, res) => {
  try {
    const body = req.body;
    const username = (body.username || "").trim();
    const password = body.password;

    if (!username || !password) {
      return sendJson(res, 400, { error: "Username and password required" });
    }

    const [rows] = await pool.query(
      `SELECT u.UserID, u.Username, u.Password, u.Role, u.EmployeeID, u.CustomerID, c.Email
         FROM users u
         LEFT JOIN customer c ON u.CustomerID = c.CustomerID
         LEFT JOIN employee e ON u.EmployeeID = e.EmployeeID
         WHERE u.Username = ?
           AND u.IsDeleted = 0
           AND (u.CustomerID IS NULL OR c.IsDeleted = 0)
           AND (u.EmployeeID IS NULL OR e.IsDeleted = 0)`,
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

    if (STAFF_ROLES.includes(user.Role)) {
      const token = signStaffToken(user);
      return sendJson(res, 200, {
        token,
        username: user.Username,
        email: user.Email || null,
        role: user.Role,
        employeeId: user.EmployeeID
      });
    }

    if (user.Role === "Customer" && user.CustomerID) {
      const token = signCustomerToken(user);
      return sendJson(res, 200, {
        token,
        username: user.Username,
        email: user.Email || null,
        role: "Customer",
        customerId: user.CustomerID
      });
    }

    return sendJson(res, 403, { error: "This account cannot sign in" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Login failed" });
  }
});

// POST /signup — create customer + users row, return customer JWT
router.post("/signup", async (req, res) => {
  try {
    const body = req.body;
    const username = (body.username || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password;

    if (!username || !email || !password) {
      return sendJson(res, 400, { error: "Username, email, and password required" });
    }

    if (await findStaffByEmail(email)) {
      return sendJson(res, 403, {
        error: "Staff should use the staff login page."
      });
    }

    const [existingCustomer] = await pool.query(
      "SELECT CustomerID FROM customer WHERE Email = ? AND IsDeleted = 0",
      [email]
    );
    if (existingCustomer.length > 0) {
      return sendJson(res, 400, { error: "An account with that email already exists" });
    }

    const [existingUser] = await pool.query(
      "SELECT UserID FROM users WHERE Username = ? AND IsDeleted = 0",
      [username]
    );
    if (existingUser.length > 0) {
      return sendJson(res, 400, { error: "That login is already taken" });
    }

    const passwordHash = await hashPassword(password);
    const [customerResult] = await pool.query(
      "INSERT INTO customer (Email) VALUES (?)",
      [email]
    );
    const customerId = customerResult.insertId;

    const [userResult] = await pool.query(
      `INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
         VALUES (?, ?, 'Customer', NULL, ?)`,
      [username, passwordHash, customerId]
    );

    const token = signCustomerToken({
      UserID: userResult.insertId,
      Username: username,
      CustomerID: customerId
    });

    return sendJson(res, 201, {
      token,
      username,
      email,
      role: "Customer",
      customerId
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Signup failed" });
  }
});

module.exports = router;
