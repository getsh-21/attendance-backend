// This file defines all URLs an employee can call after logging in.

const express = require("express");
const { protect } = require("../middleware/auth");
const {
  uploadProfileImage,
  uploadPermissionFile,
} = require("../middleware/upload");
const {
  getProfile,
  updateProfile,
  checkIn,
  checkOut,
  requestPermission,
  getHistory,
  getNotifications,
} = require("../controllers/employeeController");

const router = express.Router();

router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  uploadProfileImage.single("profileImage"),
  updateProfile,
);
router.post("/checkin", protect, checkIn);
router.post("/checkout", protect, checkOut);
router.post(
  "/permission",
  protect,
  uploadPermissionFile.single("medicalFile"),
  requestPermission,
);
router.get("/history", protect, getHistory);
router.get("/notifications", protect, getNotifications);

module.exports = router;
