// This file handles user registration, login, and password reset.

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../services/emailService");

// Creates a JWT token containing the user's ID and role
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// POST /api/auth/register
// Creates a new employee account
const registerUser = async (req, res, next) => {
  try {
    const { fullName, email, password, department, position } = req.body;

    if (!fullName || !email || !password || !department || !position) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      department,
      position,
      role: "employee",
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        position: user.position,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
// Logs in an employee or admin
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been disabled" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: user.department,
        position: user.position,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password  Body: { email }
// Generates a reset token, saves it, and emails a reset link
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // We respond the same way whether or not the email exists.
    // This prevents attackers from using this endpoint to discover
    // which emails are registered in the system.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, a reset link has been sent.",
      });
    }

    // Generate a random, hard-to-guess token
    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // valid for 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail(
      user.email,
      "Password Reset Request",
      `Hello ${user.fullName},\n\nYou requested a password reset. Click the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`
    );

    res.status(200).json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password/:token  Body: { newPassword }
// Verifies the token and sets a new password
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Find a user with this exact token that hasn't expired yet
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // $gt = "greater than" now = not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired" });
    }

    user.password = newPassword; // gets hashed automatically by the pre-save hook
    user.resetPasswordToken = null; // clear the token so it can't be reused
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: "Password has been reset successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };