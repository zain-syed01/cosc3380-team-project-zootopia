const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
           e.*,
           (
             SELECT COUNT(*)
             FROM animal a
             JOIN species s ON s.SpeciesID = a.SpeciesID
             WHERE a.EnclosureID = e.EnclosureID
              AND a.IsDeleted = 0
              AND s.IsDeleted = 0
           ) AS AnimalCount,
           COALESCE(o.IsOpenToday, 0) AS IsOpenToday
         FROM enclosure e
         LEFT JOIN v_enclosure_open_today o ON o.EnclosureID = e.EnclosureID
         WHERE e.IsDeleted = 0
         ORDER BY e.Name`
    );
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get enclosures" });
  }
});

// POST /reopen-all
router.post("/reopen-all", async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE enclosure SET Status = 'Open'
       WHERE IsDeleted = 0
         AND HabitatType <> 'Medical'
         AND Name <> 'Quarantine Ward'`
    );

    return sendJson(res, 200, {
      message: "All enclosures reopened",
      updated: result.affectedRows
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not reopen enclosures" });
  }
});

// GET /:id/animals
router.get("/:id/animals", async (req, res) => {
  const { id } = req.params;
  try {
    const [encRows] = await pool.query(
      "SELECT * FROM enclosure WHERE EnclosureID = ? AND IsDeleted = 0",
      [id]
    );
    if (encRows.length === 0) {
      return sendJson(res, 404, { error: "Enclosure not found" });
    }

    const [animals] = await pool.query(
      `SELECT
           a.AnimalID,
           a.Name AS AnimalName,
           a.Sex,
           a.DateOfBirth,
           a.IsSick,
           s.CommonName AS Species
         FROM animal a
         JOIN species s ON s.SpeciesID = a.SpeciesID
         WHERE a.EnclosureID = ?
           AND a.IsDeleted = 0
           AND s.IsDeleted = 0
         ORDER BY a.Name`,
      [id]
    );

    return sendJson(res, 200, {
      enclosure: encRows[0],
      animals,
      animalCount: animals.length
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get enclosure animals" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM enclosure WHERE EnclosureID = ? AND IsDeleted = 0",
      [id]
    );

    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Enclosure not found" });
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS AnimalCount
         FROM animal a
         JOIN species s ON s.SpeciesID = a.SpeciesID
         WHERE a.EnclosureID = ?
         AND a.IsDeleted = 0
         AND s.IsDeleted = 0`,
      [id]
    );

    return sendJson(res, 200, {
      ...rows[0],
      AnimalCount: countRows[0].AnimalCount
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get enclosure" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { Name, HabitatType, Capacity, Location, Status } = body;

    if (!Name || !HabitatType || !Capacity || !Location || !Status) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }

    const [result] = await pool.query(
      `INSERT INTO enclosure (Name, HabitatType, Capacity, Location, Status)
         VALUES (?, ?, ?, ?, ?)`,
      [Name, HabitatType, Capacity, Location, Status]
    );

    return sendJson(res, 201, { EnclosureID: result.insertId });
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
    const { Name, HabitatType, Capacity, Location, Status } = body;

    const [result] = await pool.query(
      `UPDATE enclosure
         SET Name = ?, HabitatType = ?, Capacity = ?, Location = ?, Status = ?
         WHERE EnclosureID = ? AND IsDeleted = 0`,
      [Name, HabitatType, Capacity, Location, Status, id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Enclosure not found" });
    }

    return sendJson(res, 200, { message: "Enclosure updated" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// DELETE /:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [animalRows] = await pool.query(
      `SELECT COUNT(*) AS AnimalCount
       FROM animal
       WHERE EnclosureID = ?
         AND IsDeleted = 0`,
      [id]
    );

    const animalCount = animalRows[0].AnimalCount;

    if (animalCount > 0) {
      return sendJson(res, 409, {
        error: `Cannot delete this enclosure because it still contains ${animalCount} active animal(s). Please reassign the animals first.`
      });
    }

    const [result] = await pool.query(
      `UPDATE enclosure
       SET IsDeleted = 1
       WHERE EnclosureID = ?
         AND IsDeleted = 0`,
      [id]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Enclosure not found" });
    }

    await pool.query(
      `UPDATE attraction
       SET IsDeleted = 1
       WHERE EnclosureID = ?
         AND IsDeleted = 0`,
      [id]
    );

    return sendJson(res, 200, {
      message: "Enclosure deleted"
    });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, {
      error: "Could not delete enclosure"
    });
  }
});

module.exports = router;