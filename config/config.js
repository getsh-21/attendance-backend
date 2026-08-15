// This file stores fixed settings used across the whole app —
// the attendance time windows.

module.exports = {
  ATTENDANCE_WINDOWS: {
    morning: {
      checkInStart: "06:00",
      checkInEnd: "08:05",
      checkOutStart: "11:05", // checkout allowed from this time onward — no upper limit
    },
    afternoon: {
      // Afternoon check-in is NOT a fixed clock time anymore — it's calculated
      // per employee, based on when THAT employee checked out in the morning.
      checkInOffsetMinutes: 60, // window opens 1 hour after their morning checkout
      checkInWindowMinutes: 5, // window stays open for 5 minutes
      checkOutStart: "17:00", // checkout allowed from this time onward — no upper limit
    },
  },
};
