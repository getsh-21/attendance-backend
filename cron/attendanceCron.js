// This file runs a background job that keeps today's attendance records
// up to date, so admin reports stay accurate even between page loads
// (the sync also happens on-demand when pages are viewed, but this
// catches the gap in between).

const cron = require("node-cron");
const { getTodayDateString } = require("../utils/attendanceRules");
const { syncAttendanceForDate } = require("../services/attendanceSyncService");

const runDailySync = async () => {
  const today = getTodayDateString();
  await syncAttendanceForDate(today);
  console.log(`Cron: attendance sync completed for ${today}`);
};

const startAttendanceCron = () => {
  cron.schedule("*/5 * * * *", runDailySync, {
    timezone: "Africa/Addis_Ababa",
  });
  console.log("Attendance cron jobs scheduled (EAT timezone)");
};

module.exports = { startAttendanceCron };
