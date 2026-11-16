const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
           e.EmployeeID,
           e.FirstName,
           e.LastName,
           e.HireDate,
           e.PhoneNumber,
           e.EmailAddress,
           e.Salary,
           e.SupervisorID,
           e.EnclosureID,
           u.Username,
           u.Role,
           enc.Name AS EnclosureName
         FROM employee e
         LEFT JOIN users u ON u.EmployeeID = e.EmployeeID AND u.IsDeleted = 0
         LEFT JOIN enclosure enc ON enc.EnclosureID = e.EnclosureID
         WHERE e.IsDeleted = 0
         ORDER BY e.LastName, e.FirstName`
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get employees" });
  }
});

// GET /:id/shops
router.get("/:id/shops", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT s.ShopID, s.Name, s.Location, s.ShopType
         FROM employee_shop es
         JOIN shop s ON s.ShopID = es.ShopID
         WHERE es.EmployeeID = ? AND s.IsDeleted = 0`,
      [id]
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get employee shops" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT e.*, u.Username, u.Role
         FROM employee e
         LEFT JOIN users u ON u.EmployeeID = e.EmployeeID AND u.IsDeleted = 0
         WHERE e.EmployeeID = ? AND e.IsDeleted = 0`,
      [id]
    );
    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Employee not found" });
    }
    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get employee" });
  }
});

// POST /
router.post("/", async (req, res) => {
  let connection;
  try {
    const body = req.body;
    const {
      FirstName,
      LastName,
      HireDate,
      PhoneNumber,
      EmailAddress,
      Salary,
      SupervisorID,
      EnclosureID,
      Username,
      Password,
      Role,
      ShopIDs
    } = body;

    if (
      !FirstName ||
      !LastName ||
      !HireDate ||
      !PhoneNumber ||
      !EmailAddress ||
      !Salary ||
      !Username ||
      !Password ||
      !Role
    ) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    if (!["Manager", "Zookeeper", "Cashier"].includes(Role)) {
      return sendJson(res, 400, { error: "Role must be Manager, Zookeeper, or Cashier" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [empResult] = await connection.query(
      `INSERT INTO employee
           (FirstName, LastName, HireDate, PhoneNumber, EmailAddress, Salary, SupervisorID, EnclosureID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        FirstName,
        LastName,
        HireDate,
        PhoneNumber,
        EmailAddress,
        Salary,
        SupervisorID || null,
        EnclosureID || null
      ]
    );
    const employeeId = empResult.insertId;

    await connection.query(
      `INSERT INTO users (Username, Password, Role, EmployeeID, CustomerID)
         VALUES (?, ?, ?, ?, NULL)`,
      [Username, Password, Role, employeeId]
    );

    if (Array.isArray(ShopIDs)) {
      for (const shopId of ShopIDs) {
        await connection.query(
          "INSERT INTO employee_shop (EmployeeID, ShopID) VALUES (?, ?)",
          [employeeId, shopId]
        );
      }
    }

    await connection.commit();
    connection.release();
    return sendJson(res, 201, { EmployeeID: employeeId });
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

// PUT /:id/shops
router.put("/:id/shops", async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    const body = req.body;
    const shopIds = Array.isArray(body.ShopIDs) ? body.ShopIDs : [];

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [emp] = await connection.query(
      "SELECT EmployeeID FROM employee WHERE EmployeeID = ? AND IsDeleted = 0",
      [id]
    );
    if (emp.length === 0) {
      await connection.rollback();
      connection.release();
      return sendJson(res, 404, { error: "Employee not found" });
    }

    await connection.query("DELETE FROM employee_shop WHERE EmployeeID = ?", [id]);
    for (const shopId of shopIds) {
      await connection.query(
        "INSERT INTO employee_shop (EmployeeID, ShopID) VALUES (?, ?)",
        [id, shopId]
      );
    }

    await connection.commit();
    connection.release();
    return sendJson(res, 200, { message: "Shops updated" });
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
    const {
      FirstName,
      LastName,
      HireDate,
      PhoneNumber,
      EmailAddress,
      Salary,
      SupervisorID,
      EnclosureID,
      Role
    } = body;

    const [result] = await pool.query(
      `UPDATE employee
         SET FirstName = ?, LastName = ?, HireDate = ?, PhoneNumber = ?,
             EmailAddress = ?, Salary = ?, SupervisorID = ?, EnclosureID = ?
         WHERE EmployeeID = ? AND IsDeleted = 0`,
      [
        FirstName,
        LastName,
        HireDate,
        PhoneNumber,
        EmailAddress,
        Salary,
        SupervisorID || null,
        EnclosureID || null,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Employee not found" });
    }

    if (Role && ["Manager", "Zookeeper", "Cashier"].includes(Role)) {
      await pool.query(
        "UPDATE users SET Role = ? WHERE EmployeeID = ? AND IsDeleted = 0",
        [Role, id]
      );
    }

    return sendJson(res, 200, { message: "Employee updated" });
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
      "UPDATE employee SET IsDeleted = 1 WHERE EmployeeID = ? AND IsDeleted = 0",
      [id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Employee not found" });
    }
    await pool.query(
      "UPDATE users SET IsDeleted = 1 WHERE EmployeeID = ? AND IsDeleted = 0",
      [id]
    );
    return sendJson(res, 200, { message: "Employee deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete employee" });
  }
});

module.exports = router;