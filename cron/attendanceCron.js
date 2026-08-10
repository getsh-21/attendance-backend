// This file runs an automatic job that marks employees "Absent"
// if they didn't check in during the allowed time window.

const cron = require("node-cron");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { getTodayDateString } = require("../utils/attendanceRules");

// Finds or creates today's record for a user, then marks a session Absent
const markAbsentIfMissing = async (session) => {
  const today = getTodayDateString();
  const statusField = session === "morning" ? "morningStatus" : "afternoonStatus";
  const checkInField = session === "morning" ? "morningCheckIn" : "afternoonCheckIn";

  const employees = await User.find({ role: "employee", isActive: true });

  for (const employee of employees) {
    let record = await Attendance.findOne({ employee: employee._id, date: today });

    if (!record) {
      record = new Attendance({ employee: employee._id, date: today });
    }

    if (!record[checkInField]) {
      record[statusField] = "Absent";
      await record.save();
    }
  }

  console.log(`Cron: ${session} absence check completed for ${today}`);
};

// Schedules the two jobs. Cron format: "minute hour * * *" (24-hour clock, server time)
const startAttendanceCron = () => {
  // Runs at 08:06 daily — right after the morning check-in window (06:00-08:05) closes
  cron.schedule("6 8 * * *", () => markAbsentIfMissing("morning"));

  // Runs at 13:06 daily — right after the afternoon check-in window (13:00-13:05) closes
  cron.schedule("6 13 * * *", () => markAbsentIfMissing("afternoon"));

  console.log("Attendance cron jobs scheduled");
};

module.exports = { startAttendanceCron };