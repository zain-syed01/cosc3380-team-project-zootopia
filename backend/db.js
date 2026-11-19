const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function serialize(value) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = serialize(nested);
    }
    return out;
  }
  return value;
}

function isWrite(sql) {
  return /^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(sql);
}

async function runQuery(client, sql, params = []) {
  if (isWrite(sql)) {
    const affectedRows = Number(await client.$executeRawUnsafe(sql, ...params));
    let insertId = 0;
    if (/^\s*INSERT/i.test(sql)) {
      const rows = await client.$queryRawUnsafe("SELECT LAST_INSERT_ID() AS insertId");
      insertId = Number(rows[0].insertId);
    }
    return [{ affectedRows, insertId, changedRows: affectedRows }];
  }

  const rows = await client.$queryRawUnsafe(sql, ...params);
  return [serialize(rows)];
}

const pool = {
  prisma,
  query(sql, params = []) {
    return runQuery(prisma, sql, params);
  },
  async getConnection() {
    let settleOk;
    let settleErr;
    const settled = new Promise((resolve, reject) => {
      settleOk = resolve;
      settleErr = reject;
    });

    let connection;
    let ready;
    const readyPromise = new Promise((resolve) => {
      ready = resolve;
    });

    const txPromise = prisma
      .$transaction(async (tx) => {
        connection = {
          query(sql, params = []) {
            return runQuery(tx, sql, params);
          },
          async beginTransaction() {},
          async commit() {
            settleOk();
          },
          async rollback() {
            const error = new Error("ROLLBACK");
            error.code = "ROLLBACK";
            settleErr(error);
            throw error;
          },
          release() {}
        };
        ready();
        await settled;
      })
      .catch((error) => {
        if (error && error.code === "ROLLBACK") {
          return null;
        }
        throw error;
      });

    await readyPromise;

    const originalCommit = connection.commit;
    const originalRollback = connection.rollback;

    connection.commit = async () => {
      await originalCommit();
      await txPromise;
    };

    connection.rollback = async () => {
      try {
        await originalRollback();
      } catch (_) {
        // rollback signals the transaction to abort
      }
      await txPromise;
    };

    return connection;
  }
};

module.exports = pool;
module.exports.prisma = prisma;
