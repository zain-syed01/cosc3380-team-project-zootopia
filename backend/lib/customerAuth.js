const pool = require("../db");

async function findStaffByEmail(email) {
  const [rows] = await pool.query(
    "SELECT EmployeeID FROM employee WHERE EmailAddress = ? AND IsDeleted = 0",
    [email]
  );
  return rows[0] || null;
}

module.exports = {
  findStaffByEmail
};
