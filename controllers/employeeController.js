// This file handles everything a logged-in employee can do:
// check in, check out, request permission, view history, update profile.

const Attendance = require("../models/Attendance");
const Permission = require("../models/Permission");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  isMorningCheckInAllowed,
  isMorningCheckoutAllowed,
  isAfternoonCheckInAllowed,
  isAfternoonCheckoutAllowed,
  getTodayDateString,
} = require("../utils/attendanceRules");

// GET /api/profile
const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// PUT /api/profile
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, department, position } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (position) user.position = position;

    if (req.file) {
      user.profileImage = req.file.path;
    }

    await user.save();

    res.status(200).json({ success: true, message: "Profile updated", user });
  } catch (error) {
    next(error);
  }
};

// POST /api/checkin  Body: { session: "morning" | "afternoon" }
const checkIn = async (req, res, next) => {
  try {
    const { session } = req.body;

    if (!["morning", "afternoon"].includes(session)) {
      return res.status(400).json({ message: "Session must be 'morning' or 'afternoon'" });
    }

    // Check the strict time window BEFORE allowing check-in at all
    if (session === "morning" && !isMorningCheckInAllowed()) {
      return res.status(400).json({ message: "Check-in is only allowed between 06:00 and 08:05" });
    }
    if (session === "afternoon" && !isAfternoonCheckInAllowed()) {
      return res.status(400).json({ message: "Check-in is only allowed between 13:00 and 13:05" });
    }

    const today = getTodayDateString();
    const now = new Date();

    let record = await Attendance.findOne({ employee: req.user._id, date: today });
    if (!record) {
      record = new Attendance({ employee: req.user._id, date: today });
    }

    const checkInField = session === "morning" ? "morningCheckIn" : "afternoonCheckIn";
    const statusField = session === "morning" ? "morningStatus" : "afternoonStatus";

    if (record[checkInField]) {
      return res.status(400).json({ message: `Already checked in for ${session} session` });
    }

    // Since check-in is only accepted inside the allowed window, it's always "On Time"
    record[checkInField] = now;
    record[statusField] = "On Time";

    await record.save();

    res.status(200).json({
      success: true,
      message: `${session} check-in recorded as On Time`,
      attendance: record,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/checkout  Body: { session: "morning" | "afternoon" }
const checkOut = async (req, res, next) => {
  try {
    const { session } = req.body;

    if (!["morning", "afternoon"].includes(session)) {
      return res.status(400).json({ message: "Session must be 'morning' or 'afternoon'" });
    }

    if (session === "morning" && !isMorningCheckoutAllowed()) {
      return res.status(400).json({ message: "Checkout is only allowed between 14:00 and 18:00" });
    }
    if (session === "afternoon" && !isAfternoonCheckoutAllowed()) {
      return res.status(400).json({ message: "Checkout is only allowed from 17:00 onward" });
    }

    const today = getTodayDateString();
    const record = await Attendance.findOne({ employee: req.user._id, date: today });

    if (!record) {
      return res.status(400).json({ message: "No check-in found for today" });
    }

    const checkOutField = session === "morning" ? "morningCheckOut" : "afternoonCheckOut";
    const checkInField = session === "morning" ? "morningCheckIn" : "afternoonCheckIn";

    if (!record[checkInField]) {
      return res.status(400).json({ message: `You must check in for ${session} before checking out` });
    }

    if (record[checkOutField]) {
      return res.status(400).json({ message: `Already checked out for ${session} session` });
    }

    record[checkOutField] = new Date();
    await record.save();

    res.status(200).json({
      success: true,
      message: `${session} check-out recorded`,
      attendance: record,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/permission
const requestPermission = async (req, res, next) => {
  try {
    const { position, permissionType, reason, startDate, endDate } = req.body;

    if (!position || !permissionType || !reason || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const permission = await Permission.create({
      employee: req.user._id,
      position,
      permissionType,
      reason,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      message: "Permission request submitted",
      permission,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/history?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=10
const getHistory = async (req, res, next) => {
  try {
    const { from, to, page = 1, limit = 10 } = req.query;

    const filter = { employee: req.user._id };

    if (from && to) {
      filter.date = { $gte: from, $lte: to };
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Attendance.countDocuments(filter);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      records,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  checkIn,
  checkOut,
  requestPermission,
  getHistory,
  getNotifications,
};