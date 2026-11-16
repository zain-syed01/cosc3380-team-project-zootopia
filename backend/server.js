const { loadEnv } = require("./lib/env");
loadEnv();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const pool = require("./db");
const { sendJson } = require("./lib/respond");

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "..", "frontend", "dist");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await pool.prisma.$queryRaw`SELECT 1`;
    return sendJson(res, 200, { message: "Database connected!" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Database connection failed" });
  }
});

app.use("/api/animals", require("./routes/animals"));
app.use("/api/enclosures", require("./routes/enclosures"));
app.use("/api/species", require("./routes/species"));
app.use("/api/shops", require("./routes/shops"));
app.use("/api/products", require("./routes/products"));
app.use("/api/attractions", require("./routes/attractions"));
app.use("/api/closures", require("./routes/closures"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api", require("./routes/auth"));
app.use("/api", require("./routes/checkout"));
app.use("/api", require("./routes/transactions"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/customers", require("./routes/customers"));

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
  };
  return types[ext] || "application/octet-stream";
}

function tryServeFrontend(req, res, pathname) {
  if (!fs.existsSync(DIST)) {
    return false;
  }

  const safePath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(DIST, safePath));

  if (!filePath.startsWith(DIST)) {
    return false;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    res.status(200).type(contentType(filePath));
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  const indexPath = path.join(DIST, "index.html");
  if (fs.existsSync(indexPath)) {
    res.status(200).type(contentType(indexPath));
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    fs.createReadStream(indexPath).pipe(res);
    return true;
  }

  return false;
}

app.use((req, res, next) => {
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    !req.path.startsWith("/api") &&
    tryServeFrontend(req, res, req.path)
  ) {
    return;
  }
  next();
});

app.use((req, res) => {
  sendJson(res, 404, { error: "Route not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});