// This file connects Permission requests to Attendance records. When a
// permission is created or its status changes, this figures out which
// dates and which sessions (morning/afternoon) it covers, and labels the
// corresponding Attendance record's status as "Permission Allowed",
// "Permission Denied", or "Permission Pending" - but only for sessions
// that haven't already been actually checked into.

const Attendance = require("../models/Attendance");
const {
  dateStringEAT,
  timeOfDayMinutesEAT,
  timeToMinutes,
  SESSION_REFERENCE_WINDOWS,
} = require("../utils/attendanceRules");

const permissionCoversDate = (permission, dateString) => {
  const startDateStr = dateStringEAT(new Date(permission.startDate));
  const endDateStr = dateStringEAT(new Date(permission.endDate));
  return dateString >= startDateStr && dateString <= endDateStr;
};

const permissionCoversSession = (permission, dateString, window) => {
  if (!permissionCoversDate(permission, dateString)) return false;

  const startDateStr = dateStringEAT(new Date(permission.startDate));
  const endDateStr = dateStringEAT(new Date(permission.endDate));

  // For the first day of the permission, use the real start time.
  // For days in between, assume the whole day is covered.
  let dayStartMinutes = 0;
  let dayEndMinutes = 1440;

  if (dateString === startDateStr) {
    dayStartMinutes = timeOfDayMinutesEAT(new Date(permission.startDate));
  }
  if (dateString === endDateStr) {
    dayEndMinutes = timeOfDayMinutesEAT(new Date(permission.endDate));
  }

  const winStart = timeToMinutes(window.start);
  const winEnd = timeToMinutes(window.end);

  return dayStartMinutes <= winEnd && dayEndMinutes >= winStart;
};

const statusLabelFor = (permissionStatus) => {
  if (permissionStatus === "Approved") return "Permission Allowed";
  if (permissionStatus === "Rejected") return "Permission Denied";
  return "Permission Pending";
};

// Every calendar date (YYYY-MM-DD, EAT) covered by a permission's range
const getDateRangeStrings = (permission) => {
  const dates = [];
  const startStr = dateStringEAT(new Date(permission.startDate));
  const endStr = dateStringEAT(new Date(permission.endDate));
  let cursor = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

// Applies (or re-applies, after admin approves/rejects) a permission's
// status onto every Attendance record/session it covers.
const applyPermissionToAttendance = async (permission) => {
  const label = statusLabelFor(permission.status);
  const dateStrings = getDateRangeStrings(permission);

  for (const dateString of dateStrings) {
    let record = await Attendance.findOne({
      employee: permission.employee,
      date: dateString,
    });
    if (!record) {
      record = new Attendance({
        employee: permission.employee,
        date: dateString,
      });
    }

    let changed = false;

    if (
      permissionCoversSession(
        permission,
        dateString,
        SESSION_REFERENCE_WINDOWS.morning,
      ) &&
      !record.morningCheckIn
    ) {
      record.morningCheckInStatus = label;
      changed = true;
    }

    if (
      permissionCoversSession(
        permission,
        dateString,
        SESSION_REFERENCE_WINDOWS.afternoon,
      ) &&
      !record.afternoonCheckIn
    ) {
      record.afternoonCheckInStatus = label;
      changed = true;
    }

    if (changed) await record.save();
  }
};

module.exports = { applyPermissionToAttendance };
