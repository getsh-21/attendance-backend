// This file defines the URLs for authentication: register, login, and password reset.

const express = require("express");
const { body } = require("express-validator");
const { registerUser, loginUser, forgotPassword, resetPassword } = require("../controllers/authController");
const { validateRequest } = require("../middleware/validateRequest");

const router = express.Router();

// Rules for registration: check each field before allowing it through
const registerValidation = [
  body("fullName").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("department").notEmpty().withMessage("Department is required"),
  body("position").notEmpty().withMessage("Position is required"),
];

const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", registerValidation, validateRequest, registerUser);
router.post("/login", loginValidation, validateRequest, loginUser);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;