// This file defines all URLs an employee can call after logging in.
// Every route here uses "protect" — you must be logged in to use any of them.

const express = require("express");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");
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
router.put("/profile", protect, upload.single("profileImage"), updateProfile);
router.post("/checkin", protect, checkIn);
router.post("/checkout", protect, checkOut);
router.post("/permission", protect, requestPermission);
router.get("/history", protect, getHistory);
router.get("/notifications", protect, getNotifications);

module.exports = router;