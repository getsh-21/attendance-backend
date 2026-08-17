// This file decides whether a check-in/check-out is currently allowed.
// All time comparisons are calculated in East Africa Time (EAT, UTC+3)
// explicitly - NOT the server's own local time. This matters because
// Render runs servers in UTC by default, which would otherwise make
// check-in windows appear closed even during the correct local time
// in Ethiopia.

const { ATTENDANCE_WINDOWS } = require("../config/config");

const EAT_OFFSET_MINUTES = 180; // Ethiopia is always UTC+3, no daylight saving

// Current time as "minutes since midnight" in EAT, regardless of server timezone
const nowMinutesInEAT = () => {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + EAT_OFFSET_MINUTES) % 1440;
};

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const isWithinWindow = (nowMinutes, startStr, endStr) => {
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);
  return nowMinutes >= start && nowMinutes <= end;
};

const isMorningCheckInAllowed = () => {
  const nowMinutes = nowMinutesInEAT();
  return isWithinWindow(
    nowMinutes,
    ATTENDANCE_WINDOWS.morning.checkInStart,
    ATTENDANCE_WINDOWS.morning.checkInEnd,
  );
};

const isMorningCheckoutAllowed = () => {
  const nowMinutes = nowMinutesInEAT();
  const startMinutes = timeToMinutes(ATTENDANCE_WINDOWS.morning.checkOutStart);
  return nowMinutes >= startMinutes;
};

// Afternoon check-in window is based on the employee's own checkout
// TIMESTAMP (a real Date object) - this part was already timezone-safe,
// since Date arithmetic always operates on the same absolute instant
// no matter what timezone is reading it.
const getAfternoonCheckInWindow = (morningCheckOutTime) => {
  const checkoutDate = new Date(morningCheckOutTime);
  const start = new Date(
    checkoutDate.getTime() +
      ATTENDANCE_WINDOWS.afternoon.checkInOffsetMinutes * 60000,
  );
  const end = new Date(
    start.getTime() + ATTENDANCE_WINDOWS.afternoon.checkInWindowMinutes * 60000,
  );
  return { start, end };
};

const isAfternoonCheckInAllowed = (morningCheckOutTime) => {
  if (!morningCheckOutTime) return false;
  const { start, end } = getAfternoonCheckInWindow(morningCheckOutTime);
  const now = new Date();
  return now >= start && now <= end;
};

const isAfternoonCheckoutAllowed = () => {
  const nowMinutes = nowMinutesInEAT();
  const startMinutes = timeToMinutes(
    ATTENDANCE_WINDOWS.afternoon.checkOutStart,
  );
  return nowMinutes >= startMinutes;
};

// "Today" must also be calculated in EAT, not server UTC - otherwise near
// midnight the server could think it's already "tomorrow" while it's
// still "today" in Ethiopia.
const getTodayDateString = () => {
  const now = new Date();
  const eatTime = new Date(now.getTime() + EAT_OFFSET_MINUTES * 60000);
  const year = eatTime.getUTCFullYear();
  const month = String(eatTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(eatTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Formats a stored Date object as 24-hour "HH:MM" IN EAT - used in error messages
const formatTime24 = (date) => {
  const eatTime = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60000);
  const h = String(eatTime.getUTCHours()).padStart(2, "0");
  const m = String(eatTime.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

module.exports = {
  isMorningCheckInAllowed,
  isMorningCheckoutAllowed,
  isAfternoonCheckInAllowed,
  isAfternoonCheckoutAllowed,
  getAfternoonCheckInWindow,
  getTodayDateString,
  formatTime24,
};
