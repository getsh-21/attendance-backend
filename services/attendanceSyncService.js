// This file makes sure every active employee has an Attendance record for
// a given date, and that "Pending" statuses get correctly finalized to
// "Absent" once their window has closed - even if nobody ever interacted
// with the system that day. Without this, an employee who never checks in
// simply has NO record at all, so they silently disappear from admin
// reports instead of showing as Absent.

const Attendance = require("../models/Attendance");
const User = require("../models/User");
const {
  hasMorningWindowClosed,
  hasPermissionAfternoonWindowClosed,
  getAfternoonWindowCloseTime,
  isDateInPast,
  getTodayDateString,
} = require("../utils/attendanceRules");

// Finalizes ONE employee's record for ONE date - creates it if missing,
// and flips any stale "Pending" status to "Absent" if its window has closed.
const syncSingleRecord = async (employeeId, dateString) => {
  let record = await Attendance.findOne({
    employee: employeeId,
    date: dateString,
  });
  const isNewRecord = !record;
  if (!record) {
    record = new Attendance({ employee: employeeId, date: dateString });
  }

  let changed = false;

  // --- Morning ---
  if (record.morningCheckInStatus === "Pending" && !record.morningCheckIn) {
    if (hasMorningWindowClosed(dateString)) {
      record.morningCheckInStatus = "Absent";
      changed = true;
    }
  }

  // --- Afternoon ---
  if (record.afternoonCheckInStatus === "Pending" && !record.afternoonCheckIn) {
    if (record.morningCheckOut) {
      // Normal flow: afternoon window closes 2h30m after morning checkout
      const closeTime = getAfternoonWindowCloseTime(record.morningCheckOut);
      if (isDateInPast(dateString) || new Date() > closeTime) {
        record.afternoonCheckInStatus = "Absent";
        changed = true;
      }
    } else if (
      record.morningCheckInStatus === "Permission Allowed" ||
      record.morningCheckInStatus === "Permission Pending"
    ) {
      // Morning was covered by a permission - fixed 09:00-14:00 window applies
      if (hasPermissionAfternoonWindowClosed(dateString)) {
        record.afternoonCheckInStatus = "Absent";
        changed = true;
      }
    } else if (record.morningCheckInStatus === "Absent") {
      // No morning checkout AND no permission means there's no legitimate
      // path to an afternoon check-in at all - mark it Absent right away.
      record.afternoonCheckInStatus = "Absent";
      changed = true;
    }
    // Otherwise (morning still On Time/Late but not checked out yet,
    // or still within its own window) - leave afternoon as Pending.
  }

  if (isNewRecord || changed) {
    await record.save();
  }

  return record;
};

// Runs syncSingleRecord for every active employee, for one specific date.
// Used by the admin's Attendance Monitoring page and by the cron job.
const syncAttendanceForDate = async (dateString) => {
  const employees = await User.find({ role: "employee", isActive: true });
  for (const employee of employees) {
    await syncSingleRecord(employee._id, dateString);
  }
};

// Runs syncSingleRecord for just ONE employee's TODAY record. Used when an
// employee views their own dashboard/history, so their own "today" entry
// is accurate even if the cron job hasn't fired yet.
const syncAttendanceForEmployeeToday = async (employeeId) => {
  const today = getTodayDateString();
  await syncSingleRecord(employeeId, today);
};

module.exports = {
  syncAttendanceForDate,
  syncAttendanceForEmployeeToday,
  syncSingleRecord,
};
