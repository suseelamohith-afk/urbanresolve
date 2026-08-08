const jwt = require("jsonwebtoken");
require('dotenv').config();

// Define the simulated Admin Token here (must match the frontend)
const FAKE_ADMIN_TOKEN = 'FAKE_ADMIN_TOKEN_12345'; 
const FAKE_ADMIN_ID = '000000000000000000000001'; // Simulated Admin ID

const verifyToken = (req, res, next) => {
  let token = req.headers["x-access-token"] || req.headers['authorization']?.split(' ')[1]; // FIX: Check Authorization header too

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  // FIX: Allow the simulated Admin token to pass verification
  if (token === FAKE_ADMIN_TOKEN) {
    req.userId = FAKE_ADMIN_ID; // Assign a predictable ID for admin operations
    console.log("✅ Admin Token Verified. ID:", FAKE_ADMIN_ID); // ADDED LOGGING
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("❌ JWT Verification Failed:", err.message); // ADDED LOGGING
      return res.status(401).send({ message: "Unauthorized! Token Invalid or Expired." }); // IMPROVED MESSAGE
    }
    req.userId = decoded.id;
    console.log("✅ JWT Verified. User ID:", req.userId); // ADDED LOGGING
    next();
  });
};

// 🛡️ CRITICAL FIX: Implement isAdmin check based on the FAKE_ADMIN_TOKEN
const isAdmin = (req, res, next) => {
    let token = req.headers["x-access-token"];
    
    // In the prototype, Admin access is strictly defined by the fake token.
    if (token === FAKE_ADMIN_TOKEN) {
        // If it's the fake token, it passed verifyToken and req.userId is set to FAKE_ADMIN_ID
        return next();
    }
    
    // In a production app, we would check the database for the user's role here:
    // User.findById(req.userId).exec((err, user) => { if (user.role === 'admin') next(); ... })

    // For the prototype, reject any non-Admin token trying to access Admin routes.
    return res.status(403).send({ message: "Require Admin Role or Admin Token!" });
};

module.exports = { verifyToken, isAdmin };