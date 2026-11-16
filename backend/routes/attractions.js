const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

function optionalInt(value) {
  if (value === undefined || value === null || value === "") return null;
  return parseInt(value, 10);
}

// GET /  (?public=1 for customer-facing list)
router.get("/", async (req, res) => {
  try {
    let sql = `
        SELECT
          a.AttractionID,
          a.Name,
          a.Type,
          a.Schedule,
          a.DurationMinutes,
          a.EnclosureID,
          e.Name AS EnclosureName,
          a.HostEmployeeID,
          CONCAT(h.FirstName, ' ', h.LastName) AS HostName
        FROM attraction a
        JOIN enclosure e ON e.EnclosureID = a.EnclosureID
        LEFT JOIN employee h ON h.EmployeeID = a.HostEmployeeID
        WHERE a.IsDeleted = 0
      `;

    if (req.query.public === "1") {
      sql += `
          AND e.IsDeleted = 0
          AND e.Status = 'Open'
          AND NOT EXISTS (
            SELECT 1 FROM zooclosure z
            WHERE z.Date = DATE(a.Schedule)
              AND (z.Scope = 'FullZoo' OR z.EnclosureID = a.EnclosureID)
          )
        `;
    }

    sql += " ORDER BY a.Schedule";
    const [rows] = await pool.query(sql);
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get attractions" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM attraction WHERE AttractionID = ? AND IsDeleted = 0",
      [id]
    );

    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Attraction not found" });
    }

    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get attraction" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { Name, Type, Schedule, EnclosureID } = body;
    const DurationMinutes = optionalInt(body.DurationMinutes);
    const HostEmployeeID = optionalInt(body.HostEmployeeID);

    if (!Name || !Type || !Schedule || !EnclosureID || !HostEmployeeID) {
      return sendJson(res, 400, { error: "Missing required fields (a host is required)" });
    }

    const [result] = await pool.query(
      `INSERT INTO attraction (Name, Type, Schedule, DurationMinutes, EnclosureID, HostEmployeeID)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [Name, Type, Schedule, DurationMinutes, EnclosureID, HostEmployeeID]
    );

    return sendJson(res, 201, { AttractionID: result.insertId });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// PUT /:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const body = req.body;
    const { Name, Type, Schedule, EnclosureID } = body;
    const DurationMinutes = optionalInt(body.DurationMinutes);
    const HostEmployeeID = optionalInt(body.HostEmployeeID);

    if (!Name || !Type || !Schedule || !EnclosureID || !HostEmployeeID) {
      return sendJson(res, 400, { error: "Missing required fields (a host is required)" });
    }

    const [result] = await pool.query(
      `UPDATE attraction
         SET Name = ?, Type = ?, Schedule = ?, DurationMinutes = ?, EnclosureID = ?, HostEmployeeID = ?
         WHERE AttractionID = ? AND IsDeleted = 0`,
      [Name, Type, Schedule, DurationMinutes, EnclosureID, HostEmployeeID, id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Attraction not found" });
    }

    return sendJson(res, 200, { message: "Attraction updated" });
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
      "UPDATE attraction SET IsDeleted = 1 WHERE AttractionID = ? AND IsDeleted = 0",
      [id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Attraction not found" });
    }

    return sendJson(res, 200, { message: "Attraction deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete attraction" });
  }
});

module.exports = router;