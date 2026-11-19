function sendJson(res, statusCode, data) {
  return res.status(statusCode).json(data);
}

module.exports = { sendJson };