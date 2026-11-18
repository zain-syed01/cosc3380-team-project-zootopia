const pool = require("../db");
const { createClerkClient } = require("@clerk/express");

function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

async function findStaffByEmail(email) {
  const [rows] = await pool.query(
    "SELECT EmployeeID FROM employee WHERE EmailAddress = ? AND IsDeleted = 0",
    [email]
  );
  return rows[0] || null;
}

async function ensureCustomerForClerk(auth) {
  if (!auth || !auth.userId) {
    const error = new Error("Customer sign in required");
    error.statusCode = 401;
    throw error;
  }

  const clerk = getClerkClient();
  const user = await clerk.users.getUser(auth.userId);
  const email =
    user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)
      ?.emailAddress ||
    user.emailAddresses[0]?.emailAddress;

  if (!email) {
    const error = new Error("Clerk account is missing an email address");
    error.statusCode = 400;
    throw error;
  }

  const normalized = String(email).trim().toLowerCase();

  const staff = await findStaffByEmail(normalized);
  if (staff) {
    const error = new Error("Staff should use the staff login page.");
    error.statusCode = 403;
    throw error;
  }

  const [byClerk] = await pool.query(
    "SELECT CustomerID, Email, ClerkUserId FROM customer WHERE ClerkUserId = ? AND IsDeleted = 0",
    [auth.userId]
  );
  if (byClerk.length > 0) {
    return {
      customerId: byClerk[0].CustomerID,
      email: byClerk[0].Email,
      clerkUserId: byClerk[0].ClerkUserId
    };
  }

  const [byEmail] = await pool.query(
    "SELECT CustomerID, Email, ClerkUserId FROM customer WHERE Email = ? AND IsDeleted = 0",
    [normalized]
  );

  if (byEmail.length > 0) {
    if (byEmail[0].ClerkUserId && byEmail[0].ClerkUserId !== auth.userId) {
      const error = new Error("That email is already linked to another account");
      error.statusCode = 409;
      throw error;
    }

    await pool.query(
      "UPDATE customer SET ClerkUserId = ? WHERE CustomerID = ?",
      [auth.userId, byEmail[0].CustomerID]
    );

    return {
      customerId: byEmail[0].CustomerID,
      email: normalized,
      clerkUserId: auth.userId
    };
  }

  const [created] = await pool.query(
    "INSERT INTO customer (Email, ClerkUserId) VALUES (?, ?)",
    [normalized, auth.userId]
  );

  return {
    customerId: created.insertId,
    email: normalized,
    clerkUserId: auth.userId
  };
}

module.exports = {
  ensureCustomerForClerk,
  findStaffByEmail
};
