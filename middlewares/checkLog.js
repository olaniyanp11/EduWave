const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login'); // Or show an unauthorized page
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded; // Attach user data to request
    next();
  } catch (err) {
    return res.redirect('/login'); // Token expired or invalid
  }
}

module.exports = authenticateToken;
// This middleware checks if the user is authenticated by verifying the JWT token.