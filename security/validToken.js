const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const token = req.headers.authorization
    ? req.headers.authorization.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token is missing" });
  }

  jwt.verify(token, "your_secret_key", (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token is not valid. Please log in again." });
    }
    req.userId = decoded.userId;
    next();
  });
}

module.exports = authenticateToken;
