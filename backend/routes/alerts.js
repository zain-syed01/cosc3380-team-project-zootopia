const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT AlertID, AlertType, Message, ProductID, AnimalID, CreatedAt, IsRead
         FROM alert
         ORDER BY IsRead ASC, CreatedAt DESC`
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get alerts" });
  }
});

// GET /unread-count
router.get("/unread-count", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS UnreadCount FROM alert WHERE IsRead = 0"
    );
    return sendJson(res, 200, { unreadCount: rows[0].UnreadCount });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get unread count" });
  }
});

// PUT /read-all
router.put("/read-all", async (req, res) => {
  try {
    await pool.query("UPDATE alert SET IsRead = 1 WHERE IsRead = 0");
    return sendJson(res, 200, { message: "All alerts marked read" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not update alerts" });
  }
});

// PUT /:id/read
router.put("/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE alert SET IsRead = 1 WHERE AlertID = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Alert not found" });
    }
    return sendJson(res, 200, { message: "Alert marked read" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not update alert" });
  }
});

// DELETE /clear-read
router.delete("/clear-read", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM alert WHERE IsRead = 1");
    return sendJson(res, 200, { message: "Read alerts deleted", deleted: result.affectedRows });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete alerts" });
  }
});

// DELETE /:id  (only if already read)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM alert WHERE AlertID = ? AND IsRead = 1",
      [id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 400, { error: "Alert not found or not read yet" });
    }
    return sendJson(res, 200, { message: "Alert deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete alert" });
  }
});

module.exports = router;