const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /today
router.get("/today", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT Reason FROM zooclosure
        WHERE \`Date\` = DATE(
        CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )
        AND Scope = 'FullZoo'
        LIMIT 1`
    );
    return sendJson(res, 200, {
      fullZooClosed: rows.length > 0,
      reason: rows.length > 0 ? rows[0].Reason : null
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not check today's closures" });
  }
});

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM zooclosure");
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get closures" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM zooclosure WHERE ClosureID = ?",
      [id]
    );
    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Closure not found" });
    }
    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get closure" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { Date, Reason, Scope, EnclosureID } = body;

    if (!Date || !Reason || !Scope) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }
    if (Scope === "FullZoo" && EnclosureID != null) {
      return sendJson(res, 400, { error: "FullZoo closure cannot have EnclosureID" });
    }
    if (Scope === "Enclosure" && EnclosureID == null) {
      return sendJson(res, 400, { error: "Enclosure closure needs EnclosureID" });
    }

    const [result] = await pool.query(
      `INSERT INTO zooclosure (\`Date\`, Reason, Scope, EnclosureID)
       VALUES (?, ?, ?, ?)`,
      [Date, Reason, Scope, EnclosureID ?? null]
    );

    if (Scope === "FullZoo") {
      await pool.query(
        `UPDATE enclosure
        SET Status = 'Closed'
        WHERE IsDeleted = 0
        AND DATE(?) = DATE(
          CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )`,
        [Date]
      );
    } else if (Scope === "Enclosure") {
      await pool.query(
        `UPDATE enclosure
        SET Status = 'Closed'
        WHERE EnclosureID = ?
        AND IsDeleted = 0
        AND DATE(?) = DATE(
          CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'America/Chicago')
        )`,
        [EnclosureID, Date]
      );
    }

    return sendJson(res, 201, { ClosureID: result.insertId });
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
    const { Date, Reason, Scope, EnclosureID } = body;
    if (Scope === "FullZoo" && EnclosureID != null) {
      return sendJson(res, 400, { error: "FullZoo closure cannot have EnclosureID" });
    }
    if (Scope === "Enclosure" && EnclosureID == null) {
      return sendJson(res, 400, { error: "Enclosure closure needs EnclosureID" });
    }

    const [result] = await pool.query(
      `UPDATE zooclosure
         SET \`Date\` = ?, Reason = ?, Scope = ?, EnclosureID = ?
         WHERE ClosureID = ?`,
      [Date, Reason, Scope, EnclosureID ?? null, id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Closure not found" });
    }
    return sendJson(res, 200, { message: "Closure updated" });
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
      "DELETE FROM zooclosure WHERE ClosureID = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Closure not found" });
    }
    return sendJson(res, 200, { message: "Closure deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete closure" });
  }
});

module.exports = router;