const bcrypt = require("bcryptjs");

const ROUNDS = 10;

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), ROUNDS);
}

async function verifyPassword(plain, hashed) {
  if (!hashed) {
    return false;
  }
  // Support legacy plaintext seeds during local upgrades.
  if (!String(hashed).startsWith("$2")) {
    return String(plain) === String(hashed);
  }
  return bcrypt.compare(String(plain), String(hashed));
}

function isZooStaffEmail(email) {
  return /^[^@\s]+@zoo\.com$/i.test(String(email || "").trim());
}

module.exports = {
  hashPassword,
  verifyPassword,
  isZooStaffEmail
};
