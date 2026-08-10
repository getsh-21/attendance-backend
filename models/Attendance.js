// This defines one attendance record: one document per employee per day.

const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // links this record to a specific user
      required: true,
    },
    date: { type: String, required: true }, // stored as "YYYY-MM-DD" for easy filtering

    morningCheckIn: { type: Date, default: null },
    morningStatus: {
      type: String,
      enum: ["On Time", "Late", "Absent", "Pending"],
      default: "Pending",
    },
    morningCheckOut: { type: Date, default: null },

    afternoonCheckIn: { type: Date, default: null },
    afternoonStatus: {
      type: String,
      enum: ["On Time", "Late", "Absent", "Pending"],
      default: "Pending",
    },
    afternoonCheckOut: { type: Date, default: null },
  },
  { timestamps: true }
);

// Prevents duplicate attendance records for the same employee on the same day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);