// Build DATABASE_URL from the existing DB_* vars when it is not set explicitly.
function loadEnv() {
  if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
  }

  if (!process.env.DATABASE_URL) {
    const user = encodeURIComponent(process.env.DB_USER || "root");
    const password = encodeURIComponent(process.env.DB_PASSWORD || "");
    const host = process.env.DB_HOST || "127.0.0.1";
    const port = process.env.DB_PORT || "3306";
    const database = process.env.DB_NAME || "final_zoo_db";
    let url = `mysql://${user}:${password}@${host}:${port}/${database}`;

    if (process.env.DB_SSL === "true") {
      url += "?sslaccept=strict";
    }

    process.env.DATABASE_URL = url;
  }
}

module.exports = { loadEnv };
