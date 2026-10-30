const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'codeorbit_secure_vault_key_2026';

function authMiddleware(req, res, next) {
  let token = null;

  // 1. Check secure HttpOnly cookie first (hidden from client JS and UI)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers['authorization']) {
    // 2. Check Authorization Bearer header fallback
    const authHeader = req.headers['authorization'];
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No active session or authorization token found.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, name, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or forged authentication token.',
    });
  }
}

module.exports = {
  authMiddleware,
  JWT_SECRET,
};
