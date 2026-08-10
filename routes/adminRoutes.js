// This file defines all URLs an admin can call.
// Every route uses "protect" (must be logged in) AND "adminOnly" (must be an admin).

const express = require("express");
const { protect, adminOnly } = require("../middleware/auth");
const {
  getDashboard,
  getUsers,
  updateUser,
  deleteUser,
  getAllAttendance,
  getAllPermissions,
  updatePermissionStatus,
  exportExcel,
} = require("../controllers/adminController");

const router = express.Router();

// Every route below runs protect + adminOnly first
router.use(protect, adminOnly);

router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.put("/user/:id", updateUser);
router.delete("/user/:id", deleteUser);
router.get("/attendance", getAllAttendance);
router.get("/permissions", getAllPermissions);
router.put("/permission/:id", updatePermissionStatus);
router.get("/export/excel", exportExcel);

module.exports = router;