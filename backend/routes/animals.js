const express = require("express");
const pool = require("../db");
const { sendJson } = require("../lib/respond");

const router = express.Router();

// GET /search?species=...&enclosureId=...&sex=...
router.get("/search", async (req, res) => {
  const { species, enclosureId, sex, isSick } = req.query;

  try {
    let sql = `
        SELECT
          a.AnimalID,
          a.Name AS AnimalName,
          a.Sex,
          a.DateOfBirth,
          a.AcquisitionDate,
          a.IsSick,
          s.CommonName AS Species,
          s.ConservationStatus,
          e.Name AS Enclosure,
          e.Status AS EnclosureStatus
        FROM animal a
        JOIN species s ON a.SpeciesID = s.SpeciesID
        JOIN enclosure e ON a.EnclosureID = e.EnclosureID
        WHERE a.IsDeleted = 0
          AND s.IsDeleted = 0
          AND e.IsDeleted = 0
      `;
    const params = [];

    if (species) {
      sql += " AND s.CommonName LIKE ?";
      params.push(`%${species}%`);
    }

    if (enclosureId) {
      sql += " AND a.EnclosureID = ?";
      params.push(enclosureId);
    }

    if (sex) {
      sql += " AND a.Sex = ?";
      params.push(sex);
    }

    if (isSick === "0" || isSick === "1") {
      sql += " AND a.IsSick = ?";
      params.push(parseInt(isSick, 10));
    }

    sql += " ORDER BY a.Name";

    const [rows] = await pool.query(sql, params);
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not search animals" });
  }
});

// GET /
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(`
        SELECT
          a.AnimalID,
          a.Name AS AnimalName,
          a.Sex,
          a.DateOfBirth,
          a.AcquisitionDate,
          a.IsSick,
          a.EnclosureID,
          s.CommonName AS Species,
          e.Name AS Enclosure
        FROM animal a
        JOIN species s ON a.SpeciesID = s.SpeciesID
        JOIN enclosure e ON a.EnclosureID = e.EnclosureID
        WHERE a.IsDeleted = 0
          AND s.IsDeleted = 0
          AND e.IsDeleted = 0
        ORDER BY a.Name
      `);
    return sendJson(res, 200, rows);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get animals" });
  }
});

// GET /:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM animal WHERE AnimalID = ? AND IsDeleted = 0",
      [id]
    );
    if (rows.length === 0) {
      return sendJson(res, 404, { error: "Animal not found" });
    }
    return sendJson(res, 200, rows[0]);
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not get animal" });
  }
});

// POST /
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const { Name, SpeciesID, EnclosureID, Sex, DateOfBirth, AcquisitionDate, IsSick } = body;
    if (!Name || !SpeciesID || !EnclosureID || !Sex || !AcquisitionDate) {
      return sendJson(res, 400, { error: "Missing required fields" });
    }
    const [result] = await pool.query(
      `INSERT INTO animal (Name, SpeciesID, EnclosureID, Sex, DateOfBirth, AcquisitionDate, IsSick)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Name,
        SpeciesID,
        EnclosureID,
        Sex,
        DateOfBirth || null,
        AcquisitionDate,
        IsSick ? 1 : 0
      ]
    );
    return sendJson(res, 201, { AnimalID: result.insertId });
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
    const { Name, SpeciesID, EnclosureID, Sex, DateOfBirth, AcquisitionDate, IsSick } = body;
    const [result] = await pool.query(
      `UPDATE animal
         SET Name = ?, SpeciesID = ?, EnclosureID = ?, Sex = ?,
             DateOfBirth = ?, AcquisitionDate = ?, IsSick = ?
         WHERE AnimalID = ? AND IsDeleted = 0`,
      [
        Name,
        SpeciesID,
        EnclosureID,
        Sex,
        DateOfBirth || null,
        AcquisitionDate,
        IsSick ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Animal not found" });
    }

    return sendJson(res, 200, { message: "Animal updated" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 400, { error: error.message });
  }
});

// DELETE /:id  (soft delete)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      "UPDATE animal SET IsDeleted = 1 WHERE AnimalID = ? AND IsDeleted = 0",
      [id]
    );
    if (result.affectedRows === 0) {
      return sendJson(res, 404, { error: "Animal not found" });
    }
    return sendJson(res, 200, { message: "Animal deleted" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Could not delete animal" });
  }
});

module.exports = router;