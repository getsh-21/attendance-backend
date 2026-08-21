// This file decides check-in/check-out eligibility and status, all in
// East Africa Time (EAT, UTC+3) explicitly - not the server's own clock.

const { ATTENDANCE_WINDOWS } = require("../config/config");

const EAT_OFFSET_MINUTES = 180;

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

const getMorningCheckInResult = () => {
  const nowMinutes = nowMinutesInEAT();
  const w = ATTENDANCE_WINDOWS.morning;
  if (isWithinWindow(nowMinutes, w.checkInOnTimeStart, w.checkInOnTimeEnd))
    return "On Time";
  if (isWithinWindow(nowMinutes, w.checkInLateStart, w.checkInLateEnd))
    return "Late";
  return null;
};

const isMorningCheckoutAllowed = () => {
  const nowMinutes = nowMinutesInEAT();
  const startMinutes = timeToMinutes(ATTENDANCE_WINDOWS.morning.checkOutStart);
  return nowMinutes >= startMinutes;
};

const getAfternoonCheckInResult = (morningCheckOutTime) => {
  if (!morningCheckOutTime) return null;
  const w = ATTENDANCE_WINDOWS.afternoon;
  const checkoutTime = new Date(morningCheckOutTime).getTime();
  const now = Date.now();
  const minutesSinceCheckout = (now - checkoutTime) / 60000;
  if (minutesSinceCheckout < 0) return null;
  if (minutesSinceCheckout <= w.onTimeMinutes) return "On Time";
  if (minutesSinceCheckout <= w.totalWindowMinutes) return "Late";
  return null;
};

const getAfternoonWindowCloseTime = (morningCheckOutTime) => {
  const checkoutDate = new Date(morningCheckOutTime);
  return new Date(
    checkoutDate.getTime() +
      ATTENDANCE_WINDOWS.afternoon.totalWindowMinutes * 60000,
  );
};

const isAfternoonCheckoutAllowed = () => {
  const nowMinutes = nowMinutesInEAT();
  const startMinutes = timeToMinutes(
    ATTENDANCE_WINDOWS.afternoon.checkOutStart,
  );
  return nowMinutes >= startMinutes;
};

// Special afternoon check-in window used ONLY when the employee's morning
// session was covered by a permission (no real morning checkout to measure
// from). Fixed EAT clock window.
const PERMISSION_AFTERNOON_WINDOW = {
  onTimeStart: "09:00",
  onTimeEnd: "13:05",
  lateStart: "13:06",
  lateEnd: "14:00",
};

const getPermissionAfternoonCheckInResult = () => {
  const nowMinutes = nowMinutesInEAT();
  const w = PERMISSION_AFTERNOON_WINDOW;
  if (isWithinWindow(nowMinutes, w.onTimeStart, w.onTimeEnd)) return "On Time";
  if (isWithinWindow(nowMinutes, w.lateStart, w.lateEnd)) return "Late";
  return null;
};

const SESSION_REFERENCE_WINDOWS = {
  morning: { start: "06:00", end: "09:00" },
  afternoon: { start: "09:00", end: "17:00" },
};

const getTodayDateString = () => {
  const now = new Date();
  const eatTime = new Date(now.getTime() + EAT_OFFSET_MINUTES * 60000);
  const year = eatTime.getUTCFullYear();
  const month = String(eatTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(eatTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateStringEAT = (date) => {
  const eatTime = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60000);
  const year = eatTime.getUTCFullYear();
  const month = String(eatTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(eatTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const timeOfDayMinutesEAT = (date) => {
  const eatTime = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60000);
  return eatTime.getUTCHours() * 60 + eatTime.getUTCMinutes();
};

const formatTime24 = (date) => {
  const eatTime = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60000);
  const h = String(eatTime.getUTCHours()).padStart(2, "0");
  const m = String(eatTime.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

// NEW: tells us whether a given calendar date (YYYY-MM-DD, EAT) is
// strictly before today - used to know if a window has definitely closed.
const isDateInPast = (dateString) => dateString < getTodayDateString();

const isDateToday = (dateString) => dateString === getTodayDateString();

// NEW: has the morning check-in window (On Time + Late, ends 09:00 EAT)
// definitely closed for this date? True for any past date, or for today
// once the current EAT time is past 09:00.
const hasMorningWindowClosed = (dateString) => {
  if (isDateInPast(dateString)) return true;
  if (isDateToday(dateString)) {
    return (
      nowMinutesInEAT() >
      timeToMinutes(ATTENDANCE_WINDOWS.morning.checkInLateEnd)
    );
  }
  return false;
};

// NEW: has the permission-based afternoon window (09:00-14:00 EAT)
// definitely closed for this date?
const hasPermissionAfternoonWindowClosed = (dateString) => {
  if (isDateInPast(dateString)) return true;
  if (isDateToday(dateString)) {
    return (
      nowMinutesInEAT() > timeToMinutes(PERMISSION_AFTERNOON_WINDOW.lateEnd)
    );
  }
  return false;
};

module.exports = {
  getMorningCheckInResult,
  isMorningCheckoutAllowed,
  getAfternoonCheckInResult,
  getAfternoonWindowCloseTime,
  isAfternoonCheckoutAllowed,
  getPermissionAfternoonCheckInResult,
  PERMISSION_AFTERNOON_WINDOW,
  SESSION_REFERENCE_WINDOWS,
  getTodayDateString,
  dateStringEAT,
  timeOfDayMinutesEAT,
  timeToMinutes,
  formatTime24,
  isDateInPast,
  isDateToday,
  hasMorningWindowClosed,
  hasPermissionAfternoonWindowClosed,
};
