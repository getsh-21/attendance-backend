// This file contains the logic that decides whether a check-in or
// check-out is currently allowed. Afternoon check-in is special — it
// depends on the individual employee's own morning checkout time,
// not a fixed clock time shared by everyone.

const { ATTENDANCE_WINDOWS } = require("../config/config");

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

const dateToMinutes = (date) => date.getHours() * 60 + date.getMinutes();

const isWithinWindow = (nowMinutes, startStr, endStr) => {
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);
  return nowMinutes >= start && nowMinutes <= end;
};

// MORNING CHECK-IN — fixed window 06:00–08:05
const isMorningCheckInAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  return isWithinWindow(
    nowMinutes,
    ATTENDANCE_WINDOWS.morning.checkInStart,
    ATTENDANCE_WINDOWS.morning.checkInEnd,
  );
};

// MORNING CHECKOUT — open-ended, allowed from 11:05 onward
const isMorningCheckoutAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  const startMinutes = timeToMinutes(ATTENDANCE_WINDOWS.morning.checkOutStart);
  return nowMinutes >= startMinutes;
};

// Calculates the afternoon check-in window for ONE employee, based on
// their actual morning checkout timestamp.
// Example: checked out at 12:00 -> window is 13:00 to 13:05.
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

// AFTERNOON CHECK-IN — allowed only during that employee's personal window
const isAfternoonCheckInAllowed = (morningCheckOutTime) => {
  if (!morningCheckOutTime) return false; // can't check in for afternoon without a morning checkout first
  const { start, end } = getAfternoonCheckInWindow(morningCheckOutTime);
  const now = new Date();
  return now >= start && now <= end;
};

// AFTERNOON CHECKOUT — open-ended, allowed from 17:00 onward
const isAfternoonCheckoutAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  const startMinutes = timeToMinutes(
    ATTENDANCE_WINDOWS.afternoon.checkOutStart,
  );
  return nowMinutes >= startMinutes;
};

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Formats a Date object as 24-hour "HH:MM" — used in error messages
const formatTime24 = (date) => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
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
