// This file handles everything an admin can do: dashboard stats,
// employee management, attendance monitoring, permission approvals, Excel export.

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Permission = require("../models/Permission");
const Notification = require("../models/Notification");
const { getTodayDateString } = require("../utils/attendanceRules");
const { generateAttendanceExcel } = require("../services/excelService");
const { sendEmail } = require("../services/emailService");
const {
  applyPermissionToAttendance,
} = require("../services/permissionAttendanceService");
const { syncAttendanceForDate } = require("../services/attendanceSyncService");

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const today = getTodayDateString();

    // Ensure today's records are up to date (including newly-Absent
    // employees) before counting, instead of waiting for the next cron run.
    await syncAttendanceForDate(today);

    const totalEmployees = await User.countDocuments({ role: "employee" });
    const todayRecords = await Attendance.find({ date: today });

    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;

    todayRecords.forEach((record) => {
      if (
        record.morningCheckInStatus === "On Time" ||
        record.afternoonCheckInStatus === "On Time"
      ) {
        presentToday++;
      }
      if (record.morningCheckInStatus === "Late") {
        lateToday++;
      }
      if (
        record.morningCheckInStatus === "Absent" ||
        record.afternoonCheckInStatus === "Absent"
      ) {
        absentToday++;
      }
    });

    const pendingPermissions = await Permission.countDocuments({
      status: "Pending",
    });
    const approvedPermissions = await Permission.countDocuments({
      status: "Approved",
    });
    const rejectedPermissions = await Permission.countDocuments({
      status: "Rejected",
    });

    res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        pendingPermissions,
        approvedPermissions,
        rejectedPermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { search, department, position } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (department) filter.department = department;
    if (position) filter.position = position;

    const users = await User.find(filter).select("-password");
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { fullName, department, position, isActive, newPassword, role } =
      req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      req.user._id.toString() === user._id.toString() &&
      (role || typeof isActive === "boolean")
    ) {
      return res
        .status(400)
        .json({ message: "You cannot change your own role or active status" });
    }

    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (position) user.position = position;
    if (typeof isActive === "boolean") user.isActive = isActive;

    if (role) {
      if (!["employee", "admin"].includes(role)) {
        return res
          .status(400)
          .json({ message: "Role must be 'employee' or 'admin'" });
      }
      user.role = role;
    }

    if (newPassword) user.password = newPassword;

    await user.save();
    res.status(200).json({ success: true, message: "User updated", user });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/attendance?date=YYYY-MM-DD
const getAllAttendance = async (req, res, next) => {
  try {
    const { date, page = 1, limit = 50 } = req.query;
    const targetDate = date || getTodayDateString();

    // Ensures every active employee has a record for this date, and that
    // any window-closed "Pending" statuses are finalized to "Absent" -
    // this is what makes absent employees actually show up, even on
    // "today" before the cron job has had a chance to run.
    await syncAttendanceForDate(targetDate);

    const records = await Attendance.find({ date: targetDate })
      .populate("employee", "fullName department position")
      .sort({ "employee.fullName": 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Attendance.countDocuments({ date: targetDate });

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

const getAllPermissions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const permissions = await Permission.find(filter)
      .populate("employee", "fullName department position")
      .sort({ createdAt: -1 });

    res
      .status(200)
      .json({ success: true, count: permissions.length, permissions });
  } catch (error) {
    next(error);
  }
};

const updatePermissionStatus = async (req, res, next) => {
  try {
    const { status, adminRemarks } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be 'Approved' or 'Rejected'" });
    }

    const permission = await Permission.findById(req.params.id).populate(
      "employee",
    );
    if (!permission)
      return res.status(404).json({ message: "Permission request not found" });

    permission.status = status;
    permission.adminRemarks = adminRemarks || "";
    await permission.save();

    await applyPermissionToAttendance(permission);

    await Notification.create({
      recipient: permission.employee._id,
      message: `Your ${permission.permissionType} request was ${status.toLowerCase()}.`,
      type:
        status === "Approved" ? "Permission Approved" : "Permission Rejected",
    });

    await sendEmail(
      permission.employee.email,
      `Permission Request ${status}`,
      `Hello ${permission.employee.fullName}, your ${permission.permissionType} request has been ${status.toLowerCase()}. Remarks: ${adminRemarks || "None"}`,
    );

    res
      .status(200)
      .json({
        success: true,
        message: `Permission ${status.toLowerCase()}`,
        permission,
      });
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDateString();

    await syncAttendanceForDate(targetDate);

    const records = await Attendance.find({ date: targetDate }).populate(
      "employee",
      "fullName department position",
    );
    const workbook = await generateAttendanceExcel(records);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance-report.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard,
  getUsers,
  updateUser,
  deleteUser,
  getAllAttendance,
  getAllPermissions,
  updatePermissionStatus,
  exportExcel,
};
