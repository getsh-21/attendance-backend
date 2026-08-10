// This file stores fixed settings used across the whole app,
// like the attendance time windows. Keeping them in one place
// means we only change them here, not in many files.

module.exports = {
  ATTENDANCE_WINDOWS: {
    morning: {
      checkInStart: "06:00",
      checkInEnd: "08:05",
      checkOutStart: "14:00",
      checkOutEnd: "18:00",
    },
    afternoon: {
      checkInStart: "13:00",
      checkInEnd: "13:05",
      checkOutStart: "17:00",
      checkOutEnd: null, // no upper limit — any time after 17:00 is allowed
    },
  },
};