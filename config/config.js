// This file stores fixed settings used across the whole app —
// the attendance time windows, all interpreted in East Africa Time (EAT).

module.exports = {
  ATTENDANCE_WINDOWS: {
    morning: {
      checkInOnTimeStart: "06:00",
      checkInOnTimeEnd: "08:05",
      checkInLateStart: "08:06",
      checkInLateEnd: "09:00",
      checkOutStart: "11:05", // open-ended, no upper limit
    },
    afternoon: {
      checkInOffsetMinutes: 60, // window opens 1 hour after employee's own morning checkout
      checkInWindowMinutes: 5,
      checkOutStart: "17:00", // open-ended, no upper limit
    },
  },
};
