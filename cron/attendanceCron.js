// This file runs automatic background jobs that mark employees "Absent"
// if they miss their check-in windows.

const cron = require("node-cron");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { getTodayDateString } = require("../utils/attendanceRules");

// Runs once daily, right after the morning check-in window closes (08:05)
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

    if (!record.morningCheckIn) {
      record.morningCheckInStatus = "Absent";
      await record.save();
    }
  }
  console.log(`Cron: morning check-in absence check completed for ${today}`);
};

// Runs frequently (every 5 minutes) since each employee's afternoon check-in
// window closes at a DIFFERENT time, depending on when they personally
// checked out in the morning. This job catches anyone whose personal
// window has just closed without them checking in.
const markAfternoonAbsentIfWindowClosed = async () => {
  const today = getTodayDateString();

  const records = await Attendance.find({
    date: today,
    morningCheckOut: { $ne: null },
    afternoonCheckIn: null,
    afternoonCheckInStatus: "Pending",
  });

  for (const record of records) {
    const windowStart = new Date(
      new Date(record.morningCheckOut).getTime() + 60 * 60 * 1000,
    );
    const windowEnd = new Date(windowStart.getTime() + 5 * 60 * 1000);

    if (new Date() > windowEnd) {
      record.afternoonCheckInStatus = "Absent";
      await record.save();
    }
  }
};

const startAttendanceCron = () => {
  cron.schedule("6 8 * * *", markMorningAbsent); // 08:06 daily
  cron.schedule("*/5 * * * *", markAfternoonAbsentIfWindowClosed); // every 5 minutes
  console.log("Attendance cron jobs scheduled");
};

module.exports = { startAttendanceCron };
