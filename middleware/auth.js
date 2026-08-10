// This file protects routes so only logged-in users (and correct roles) can access them.

const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Checks that a valid JWT token was sent with the request
const protect = async (req, res, next) => {
  let token;

  // Token normally arrives as: "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // Verify the token using our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the logged-in user's info to the request (minus password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      if (!req.user.isActive) {
        return res.status(403).json({ message: "Account is disabled" });
      }

      next(); // token is valid, continue to the actual route
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Checks that the logged-in user has the "admin" role
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
};

module.exports = { protect, adminOnly };