// This file runs automatic background jobs that mark employees "Absent"
// if they miss their check-in windows entirely. Schedules run in EAT.

const cron = require("node-cron");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const { getTodayDateString } = require("../utils/attendanceRules");

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
  // Runs at 09:01 EAT - right after the Late window (08:06-09:00) closes
  cron.schedule("1 9 * * *", markMorningAbsent, {
    timezone: "Africa/Addis_Ababa",
  });
  cron.schedule("*/5 * * * *", markAfternoonAbsentIfWindowClosed, {
    timezone: "Africa/Addis_Ababa",
  });
  console.log("Attendance cron jobs scheduled (EAT timezone)");
};

module.exports = { startAttendanceCron };
