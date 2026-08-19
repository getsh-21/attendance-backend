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
      // Afternoon check-in is measured relative to THIS employee's own
      // morning checkout time, not a fixed clock time.
      onTimeMinutes: 65, // 1 hour 5 minutes - On Time if checked in within this
      totalWindowMinutes: 150, // 2 hours 30 minutes - window closes entirely after this
      checkOutStart: "17:00", // open-ended, no upper limit
    },
  },
};
