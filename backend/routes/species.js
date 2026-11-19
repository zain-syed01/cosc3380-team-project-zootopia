const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /search?q=monkey
router.get("/search", async (req, res) => {
  try {
    const searchTerm = req.query.q;

    if (!searchTerm || !searchTerm.trim()) {
      return sendJson(res, 400, { error: "Search term is required" });
    }

    const term = `%${searchTerm.trim()}%`;

    const [rows] = await pool.query(
      `SELECT
           s.SpeciesID,
           s.CommonName,
           s.ScientificName,
           s.Diet,
           s.ConservationStatus,
           COUNT(DISTINCT a.AnimalID) AS AnimalCount,
           GROUP_CONCAT(
             DISTINCT e.Name
             ORDER BY e.Name
             SEPARATOR ', '
           ) AS Enclosures
         FROM species s
         LEFT JOIN animal a
           ON s.SpeciesID = a.SpeciesID AND a.IsDeleted = 0
         LEFT JOIN species_enclosure se
           ON s.SpeciesID = se.SpeciesID
         LEFT JOIN enclosure e
           ON se.EnclosureID = e.EnclosureID AND e.IsDeleted = 0
         WHERE s.IsDeleted = 0
           AND (s.CommonName LIKE ?
            OR s.ScientificName LIKE ?
            OR s.Diet LIKE ?
            OR s.ConservationStatus LIKE ?)
         GROUP BY
           s.SpeciesID,
           s.CommonName,
           s.ScientificName,
           s.Diet,
           s.ConservationStatus
         ORDER BY s.CommonName`,
      [term, term, term, term]
    );

    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not search species" });
  }
});

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM species WHERE IsDeleted = 0"
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get species" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM species WHERE SpeciesID = ? AND IsDeleted = 0",
      [id]
    );

    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Species not found" });
    }

    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get species" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { CommonName, ScientificName, Diet, ConservationStatus, AvgLifespan } = body;

    if (!CommonName || !ScientificName || !Diet || !ConservationStatus) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const [result] = await pool.query(
      `INSERT INTO species (CommonName, ScientificName, Diet, ConservationStatus, AvgLifespan)
         VALUES (?, ?, ?, ?, ?)`,
      [CommonName, ScientificName, Diet, ConservationStatus, AvgLifespan || null]
    );

    return sendJson(res, 201, { SpeciesID: result.insertId });
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
    const { CommonName, ScientificName, Diet, ConservationStatus, AvgLifespan } = body;

    const [result] = await pool.query(
      `UPDATE species
         SET CommonName = ?, ScientificName = ?, Diet = ?,
             ConservationStatus = ?, AvgLifespan = ?
         WHERE SpeciesID = ? AND IsDeleted = 0`,
      [CommonName, ScientificName, Diet, ConservationStatus, AvgLifespan || null, id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Species not found" });
    }

    return sendJson(res, 200, { message: "Species updated" });
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
      "UPDATE species SET IsDeleted = 1 WHERE SpeciesID = ? AND IsDeleted = 0",
      [id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Species not found" });
    }

    return sendJson(res, 200, { message: "Species deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete species" });
  }
});

module.exports = router;