// This file decides whether a check-in/check-out is currently allowed,
// and whether a check-in counts as On Time or Late. All time comparisons
// are calculated in East Africa Time (EAT, UTC+3) explicitly - NOT the
// server's own local time, since Render runs servers in UTC by default.

const { ATTENDANCE_WINDOWS } = require("../config/config");

const EAT_OFFSET_MINUTES = 180; // Ethiopia is always UTC+3, no daylight saving

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

// Returns "On Time", "Late", or null (meaning check-in is not allowed at all right now)
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

const getTodayDateString = () => {
  const now = new Date();
  const eatTime = new Date(now.getTime() + EAT_OFFSET_MINUTES * 60000);
  const year = eatTime.getUTCFullYear();
  const month = String(eatTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(eatTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime24 = (date) => {
  const eatTime = new Date(date.getTime() + EAT_OFFSET_MINUTES * 60000);
  const h = String(eatTime.getUTCHours()).padStart(2, "0");
  const m = String(eatTime.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

module.exports = {
  getMorningCheckInResult,
  isMorningCheckoutAllowed,
  isAfternoonCheckInAllowed,
  isAfternoonCheckoutAllowed,
  getAfternoonCheckInWindow,
  getTodayDateString,
  formatTime24,
};
