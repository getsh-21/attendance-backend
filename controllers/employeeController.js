// This file handles everything a logged-in employee can do:
// check in, check out, request permission (with time range + optional file),
// view history, update profile.

const Attendance = require("../models/Attendance");
const Permission = require("../models/Permission");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  getMorningCheckInResult,
  isMorningCheckoutAllowed,
  getAfternoonCheckInResult,
  isAfternoonCheckoutAllowed,
  getPermissionAfternoonCheckInResult,
  getTodayDateString,
} = require("../utils/attendanceRules");
const {
  applyPermissionToAttendance,
} = require("../services/permissionAttendanceService");
const {
  syncAttendanceForEmployeeToday,
} = require("../services/attendanceSyncService");

const PERMISSION_STATUSES = [
  "Permission Allowed",
  "Permission Denied",
  "Permission Pending",
];

const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { fullName, department, position } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (position) user.position = position;
    if (req.file) user.profileImage = req.file.path;

    await user.save();
    res.status(200).json({ success: true, message: "Profile updated", user });
  } catch (error) {
    next(error);
  }
};

const checkIn = async (req, res, next) => {
  try {
    const { session } = req.body;

    if (!["morning", "afternoon"].includes(session)) {
      return res
        .status(400)
        .json({ message: "Session must be 'morning' or 'afternoon'" });
    }

    const today = getTodayDateString();
    const now = new Date();

    let record = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });
    if (!record) {
      record = new Attendance({ employee: req.user._id, date: today });
    }

    if (session === "morning") {
      if (record.morningCheckIn) {
        return res
          .status(400)
          .json({ message: "Already checked in for morning session" });
      }

      if (
        PERMISSION_STATUSES.includes(record.morningCheckInStatus) &&
        record.morningCheckInStatus !== "Permission Denied"
      ) {
        return res.status(400).json({
          message: `You have a permission request covering this session. Current status: ${record.morningCheckInStatus}`,
        });
      }

      const result = getMorningCheckInResult();
      if (!result) {
        return res.status(400).json({
          message:
            "Morning check-in is only allowed between 06:00 and 09:00 (On Time until 08:05, Late until 09:00)",
        });
      }

      record.morningCheckIn = now;
      record.morningCheckInStatus = result;
    } else {
      if (
        PERMISSION_STATUSES.includes(record.afternoonCheckInStatus) &&
        record.afternoonCheckInStatus !== "Permission Denied"
      ) {
        return res.status(400).json({
          message: `You have a permission request covering this session. Current status: ${record.afternoonCheckInStatus}`,
        });
      }

      if (record.afternoonCheckIn) {
        return res
          .status(400)
          .json({ message: "Already checked in for afternoon session" });
      }

      const morningUnderPermission =
        (record.morningCheckInStatus === "Permission Allowed" ||
          record.morningCheckInStatus === "Permission Pending") &&
        !record.morningCheckOut;

      let result;
      if (morningUnderPermission) {
        result = getPermissionAfternoonCheckInResult();
        if (!result) {
          return res.status(400).json({
            message:
              "Afternoon check-in (after a morning permission) is only allowed between 09:00 and 14:00 (On Time until 13:05, Late until 14:00)",
          });
        }
      } else {
        if (!record.morningCheckOut) {
          return res.status(400).json({
            message:
              "You must check out from the morning session before checking in for the afternoon",
          });
        }
        result = getAfternoonCheckInResult(record.morningCheckOut);
        if (!result) {
          return res.status(400).json({
            message:
              "Afternoon check-in window has closed (2 hours 30 minutes after your morning checkout)",
          });
        }
      }

      record.afternoonCheckIn = now;
      record.afternoonCheckInStatus = result;
    }

    await record.save();

    const statusField =
      session === "morning"
        ? record.morningCheckInStatus
        : record.afternoonCheckInStatus;
    res.status(200).json({
      success: true,
      message: `${session} check-in recorded as ${statusField}`,
      attendance: record,
    });
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const { session } = req.body;

    if (!["morning", "afternoon"].includes(session)) {
      return res
        .status(400)
        .json({ message: "Session must be 'morning' or 'afternoon'" });
    }

    const today = getTodayDateString();
    const record = await Attendance.findOne({
      employee: req.user._id,
      date: today,
    });

    if (!record) {
      return res.status(400).json({ message: "No check-in found for today" });
    }

    if (session === "morning") {
      if (!isMorningCheckoutAllowed()) {
        return res
          .status(400)
          .json({
            message: "Morning checkout is only allowed from 11:05 onward",
          });
      }
      if (!record.morningCheckIn) {
        return res
          .status(400)
          .json({
            message: "You must check in for morning before checking out",
          });
      }
      if (record.morningCheckOut) {
        return res
          .status(400)
          .json({ message: "Already checked out for morning session" });
      }
      record.morningCheckOut = new Date();
      record.morningCheckOutStatus = "Completed";
    } else {
      if (!isAfternoonCheckoutAllowed()) {
        return res
          .status(400)
          .json({
            message: "Afternoon checkout is only allowed from 17:00 onward",
          });
      }
      if (!record.afternoonCheckIn) {
        return res
          .status(400)
          .json({
            message: "You must check in for afternoon before checking out",
          });
      }
      if (record.afternoonCheckOut) {
        return res
          .status(400)
          .json({ message: "Already checked out for afternoon session" });
      }
      record.afternoonCheckOut = new Date();
      record.afternoonCheckOutStatus = "Completed";
    }

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
      medicalFile: req.file ? req.file.path : "",
    });

    await applyPermissionToAttendance(permission);

    res
      .status(201)
      .json({
        success: true,
        message: "Permission request submitted",
        permission,
      });
  } catch (error) {
    next(error);
  }
};

// GET /api/history - now syncs today's own record first, so an employee's
// own history/dashboard correctly shows "Absent" for today once their
// window has closed, even if they never opened the app until later.
const getHistory = async (req, res, next) => {
  try {
    await syncAttendanceForEmployeeToday(req.user._id);

    const { from, to, page = 1, limit = 10 } = req.query;
    const filter = { employee: req.user._id };
    if (from && to) filter.date = { $gte: from, $lte: to };

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

const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    }).sort({ createdAt: -1 });
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
