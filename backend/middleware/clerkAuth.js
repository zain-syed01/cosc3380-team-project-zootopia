const { getAuth } = require("@clerk/express");
const { sendJson } = require("../lib/respond");

// JSON APIs should return 401, not a browser redirect to "/".
function requireClerkUser(req, res, next) {
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return sendJson(res, 401, { error: "Customer sign in required" });
  }
  return next();
}

module.exports = { requireClerkUser };
