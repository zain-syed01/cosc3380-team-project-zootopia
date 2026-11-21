const jwt = require("jsonwebtoken");
const { sendJson } = require("../lib/respond");

const STAFF_ROLES = ["Manager", "Zookeeper", "Cashier"];

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-zoo-staff-secret-change-me";
}

function signStaffToken(user) {
  return jwt.sign(
    {
      sub: user.UserID,
      username: user.Username,
      role: user.Role,
      employeeId: user.EmployeeID
    },
    getJwtSecret(),
    { expiresIn: "12h" }
  );
}

function signCustomerToken(user) {
  return jwt.sign(
    {
      sub: user.UserID,
      username: user.Username,
      role: "Customer",
      customerId: user.CustomerID
    },
    getJwtSecret(),
    { expiresIn: "12h" }
  );
}

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) {
    return null;
  }
  return token;
}

function requireStaff(roles = STAFF_ROLES) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    try {
      const token = readBearerToken(req);
      if (!token) {
        return sendJson(res, 401, { error: "Staff login required" });
      }

      const payload = jwt.verify(token, getJwtSecret());
      if (!allowed.includes(payload.role)) {
        return sendJson(res, 403, { error: "You do not have access to this resource" });
      }

      req.staff = {
        userId: payload.sub,
        username: payload.username,
        role: payload.role,
        employeeId: payload.employeeId
      };
      return next();
    } catch (error) {
      return sendJson(res, 401, { error: "Invalid or expired staff session" });
    }
  };
}

function requireCustomer(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return sendJson(res, 401, { error: "Customer login required" });
    }

    const payload = jwt.verify(token, getJwtSecret());
    if (payload.role !== "Customer" || !payload.customerId) {
      return sendJson(res, 403, { error: "Customer login required" });
    }

    req.customer = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      customerId: payload.customerId
    };
    return next();
  } catch (error) {
    return sendJson(res, 401, { error: "Invalid or expired customer session" });
  }
}

module.exports = {
  STAFF_ROLES,
  signStaffToken,
  signCustomerToken,
  requireStaff,
  requireCustomer
};
