const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/core/User");
const Admin = require("../models/core/Admin");
const AppError = require("../utils/AppError");
const authorize = require("./authorize");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new AppError("You are not logged in. Please provide a valid access token.", 401)
      );
    }

    // Verify access token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return next(
        new AppError("Invalid or expired access token. Please log in again.", 401)
      );
    }

    // Check if admin or user exists
    let currentUser = await Admin.findById(decoded.id);
    if (!currentUser) {
      currentUser = await User.findById(decoded.id);
    }

    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists.", 401)
      );
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware.
 * Attaches req.user if a valid token is provided, but allows unauthenticated requests to proceed.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      req.user = null;
      return next();
    }

    let currentUser = await Admin.findById(decoded.id);
    if (!currentUser) {
      currentUser = await User.findById(decoded.id);
    }

    req.user = currentUser || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  restrictTo: authorize,
};

