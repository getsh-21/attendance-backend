// This file runs automatic background jobs that mark employees "Absent"
// if they miss their check-in windows entirely. Never overwrites a
// permission-based status (Permission Allowed/Denied/Pending).

const cron = require("node-cron");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const {
  getTodayDateString,
  getAfternoonWindowCloseTime,
} = require("../utils/attendanceRules");

const PERMISSION_STATUSES = [
  "Permission Allowed",
  "Permission Denied",
  "Permission Pending",
];

const markMorningAbsent = async () => {
  const today = getTodayDateString();
  const employees = await User.find({ role: "employee", isActive: true });

  for (const employee of employees) {
    let record = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });
    if (!record)
      record = new Attendance({ employee: employee._id, date: today });

    if (
      !record.morningCheckIn &&
      !PERMISSION_STATUSES.includes(record.morningCheckInStatus)
    ) {
      record.morningCheckInStatus = "Absent";
      await record.save();
    }
  }
  console.log(`Cron: morning check-in absence check completed for ${today}`);
};

// Normal case: employee checked out from morning, has 2h30m to check in
// for the afternoon.
const markAfternoonAbsentIfWindowClosed = async () => {
  const today = getTodayDateString();

  const records = await Attendance.find({
    date: today,
    morningCheckOut: { $ne: null },
    afternoonCheckIn: null,
    afternoonCheckInStatus: "Pending",
  });

  for (const record of records) {
    const windowCloseTime = getAfternoonWindowCloseTime(record.morningCheckOut);
    if (new Date() > windowCloseTime) {
      record.afternoonCheckInStatus = "Absent";
      await record.save();
    }
  }
};

// Permission case: employee's morning was under an active permission
// (Allowed/Pending), so afternoon uses the fixed 09:00-14:00 window.
// Runs once daily right after that window closes.
const markPermissionAfternoonAbsent = async () => {
  const today = getTodayDateString();

  const records = await Attendance.find({
    date: today,
    afternoonCheckIn: null,
    morningCheckInStatus: { $in: ["Permission Allowed", "Permission Pending"] },
    afternoonCheckInStatus: "Pending",
  });

  for (const record of records) {
    record.afternoonCheckInStatus = "Absent";
    await record.save();
  }
  console.log(
    `Cron: permission-afternoon absence check completed for ${today}`,
  );
};

const startAttendanceCron = () => {
  cron.schedule("1 9 * * *", markMorningAbsent, {
    timezone: "Africa/Addis_Ababa",
  });
  cron.schedule("*/5 * * * *", markAfternoonAbsentIfWindowClosed, {
    timezone: "Africa/Addis_Ababa",
  });
  cron.schedule("1 14 * * *", markPermissionAfternoonAbsent, {
    timezone: "Africa/Addis_Ababa",
  });
  console.log("Attendance cron jobs scheduled (EAT timezone)");
};

module.exports = { startAttendanceCron };
