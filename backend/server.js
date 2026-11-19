const { loadEnv } = require("./lib/env");
loadEnv();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { clerkMiddleware } = require("@clerk/express");
const pool = require("./db");
const { sendJson } = require("./lib/respond");
const { requireStaff } = require("./middleware/auth");

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, "..", "frontend", "dist");

const app = express();
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.get("/api/health", async (req, res) => {
  try {
    await pool.prisma.$queryRaw`SELECT 1`;
    return sendJson(res, 200, { message: "Database connected!" });
  } catch (error) {
    console.error(error.message);
    return sendJson(res, 500, { error: "Database connection failed" });
  }
});

const animals = require("./routes/animals");
const enclosures = require("./routes/enclosures");
const species = require("./routes/species");
const shops = require("./routes/shops");
const products = require("./routes/products");
const attractions = require("./routes/attractions");
const closures = require("./routes/closures");
const checkout = require("./routes/checkout");
const employees = require("./routes/employees");

function protectUnlessGet(roles) {
  return (req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") {
      return next();
    }
    return requireStaff(roles)(req, res, next);
  };
}

// Public GETs for the visitor site; mutating staff routes require a JWT.
app.use("/api/animals", protectUnlessGet(["Manager", "Zookeeper", "Cashier"]), animals);
app.use("/api/enclosures", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    return next();
  }
  if (req.method === "POST" && req.path === "/reopen-all") {
    return requireStaff(["Manager"])(req, res, next);
  }
  return requireStaff(["Manager", "Zookeeper"])(req, res, next);
}, enclosures);
app.use("/api/species", protectUnlessGet(["Manager"]), species);
app.use("/api/shops", protectUnlessGet(["Manager"]), shops);
app.use("/api/products", protectUnlessGet(["Manager", "Cashier"]), products);
app.use("/api/attractions", protectUnlessGet(["Manager", "Zookeeper"]), attractions);
app.use("/api/closures", protectUnlessGet(["Manager"]), closures);

app.use("/api/reports", requireStaff(["Manager"]), require("./routes/reports"));
app.use("/api", require("./routes/auth"));
app.use("/api", (req, res, next) => {
  if (req.method === "POST" && req.path === "/checkout") {
    return next();
  }
  if (req.method === "POST" && req.path === "/sales") {
    return requireStaff(["Manager", "Cashier"])(req, res, next);
  }
  if (req.method === "GET" && req.path === "/sales/today") {
    return requireStaff(["Manager", "Cashier"])(req, res, next);
  }
  return next();
}, checkout);
app.use("/api", require("./routes/transactions"));
app.use("/api/alerts", requireStaff(["Manager"]), require("./routes/alerts"));
app.use("/api/employees", (req, res, next) => {
  // cashiers/zookeepers may read their own employee record and shop list
  if (req.method === "GET" && /^\/\d+(\/shops)?$/.test(req.path)) {
    return requireStaff(["Manager", "Cashier", "Zookeeper"])(req, res, next);
  }
  return requireStaff(["Manager"])(req, res, next);
}, employees);
app.use("/api/customers", requireStaff(["Manager"]), require("./routes/customers"));

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