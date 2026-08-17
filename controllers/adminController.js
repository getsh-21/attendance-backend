// This file handles everything an admin can do: dashboard stats,
// employee management, attendance monitoring, permission approvals, Excel export.

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Permission = require("../models/Permission");
const Notification = require("../models/Notification");
const { getTodayDateString } = require("../utils/attendanceRules");
const { generateAttendanceExcel } = require("../services/excelService");
const { sendEmail } = require("../services/emailService");

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const today = getTodayDateString();

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

// GET /api/admin/users?search=&department=&position=
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

// PUT /api/admin/user/:id
// Handles: edit info, disable/enable, reset password, and role change (promote/demote)
const updateUser = async (req, res, next) => {
  try {
    const { fullName, department, position, isActive, newPassword, role } =
      req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent an admin from accidentally demoting/locking themselves out
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

    if (newPassword) {
      user.password = newPassword;
    }

    await user.save();
    res.status(200).json({ success: true, message: "User updated", user });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/user/:id
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
    const { date, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (date) filter.date = date;

    const records = await Attendance.find(filter)
      .populate("employee", "fullName department position")
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

// GET /api/admin/permissions?status=Pending
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

// PUT /api/admin/permission/:id  Body: { status: "Approved" | "Rejected", adminRemarks }
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

// GET /api/admin/export/excel?date=YYYY-MM-DD
const exportExcel = async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) filter.date = date;

    const records = await Attendance.find(filter).populate(
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
