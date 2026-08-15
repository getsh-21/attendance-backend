// This defines one attendance record: one document per employee per day.
// Each session (morning/afternoon) now tracks check-in and check-out
// as SEPARATE statuses, since they behave differently.

const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true }, // "YYYY-MM-DD"

    morningCheckIn: { type: Date, default: null },
    // "On Time" = checked in within the window, "Absent" = window closed with no check-in,
    // "Pending" = window hasn't happened yet or hasn't closed
    morningCheckInStatus: {
      type: String,
      enum: ["On Time", "Absent", "Pending"],
      default: "Pending",
    },

    morningCheckOut: { type: Date, default: null },
    // "Completed" = checked out, "Pending" = hasn't checked out yet
    morningCheckOutStatus: {
      type: String,
      enum: ["Completed", "Pending"],
      default: "Pending",
    },

    afternoonCheckIn: { type: Date, default: null },
    afternoonCheckInStatus: {
      type: String,
      enum: ["On Time", "Absent", "Pending"],
      default: "Pending",
    },

    afternoonCheckOut: { type: Date, default: null },
    afternoonCheckOutStatus: {
      type: String,
      enum: ["Completed", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

// Prevents duplicate attendance records for the same employee on the same day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
