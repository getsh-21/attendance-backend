// This file contains the logic that decides whether a check-in or
// check-out is currently allowed, based on the strict time windows
// defined in config.js. Outside these windows, the action is rejected.

const { ATTENDANCE_WINDOWS } = require("../config/config");

// Converts "HH:MM" string into total minutes (e.g. "08:05" -> 485)
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
};

// Converts a JS Date object's time into total minutes since midnight
const dateToMinutes = (date) => {
  return date.getHours() * 60 + date.getMinutes();
};

// Checks if a given number of minutes falls within a start/end window (inclusive)
const isWithinWindow = (nowMinutes, startStr, endStr) => {
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);
  return nowMinutes >= start && nowMinutes <= end;
};

// MORNING CHECK-IN — allowed only 06:00–08:05
const isMorningCheckInAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  return isWithinWindow(nowMinutes, ATTENDANCE_WINDOWS.morning.checkInStart, ATTENDANCE_WINDOWS.morning.checkInEnd);
};

// MORNING CHECKOUT — allowed only 14:00–18:00
const isMorningCheckoutAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  return isWithinWindow(nowMinutes, ATTENDANCE_WINDOWS.morning.checkOutStart, ATTENDANCE_WINDOWS.morning.checkOutEnd);
};

// AFTERNOON CHECK-IN — allowed only 13:00–13:05
const isAfternoonCheckInAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  return isWithinWindow(nowMinutes, ATTENDANCE_WINDOWS.afternoon.checkInStart, ATTENDANCE_WINDOWS.afternoon.checkInEnd);
};

// AFTERNOON CHECKOUT — allowed from 17:00 onward, no upper limit
const isAfternoonCheckoutAllowed = () => {
  const nowMinutes = dateToMinutes(new Date());
  const startMinutes = timeToMinutes(ATTENDANCE_WINDOWS.afternoon.checkOutStart);
  return nowMinutes >= startMinutes;
};

// Returns today's date as "YYYY-MM-DD" — used to find/create today's attendance record
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

module.exports = {
  isMorningCheckInAllowed,
  isMorningCheckoutAllowed,
  isAfternoonCheckInAllowed,
  isAfternoonCheckoutAllowed,
  getTodayDateString,
};