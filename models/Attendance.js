// This defines one attendance record: one document per employee per day.

const mongoose = require("mongoose");

const STATUS_VALUES = [
  "On Time",
  "Late",
  "Absent",
  "Pending",
  "Permission Allowed",
  "Permission Denied",
  "Permission Pending",
];

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true },

    morningCheckIn: { type: Date, default: null },
    morningCheckInStatus: {
      type: String,
      enum: STATUS_VALUES,
      default: "Pending",
    },

    morningCheckOut: { type: Date, default: null },
    morningCheckOutStatus: {
      type: String,
      enum: ["Completed", "Pending"],
      default: "Pending",
    },

    afternoonCheckIn: { type: Date, default: null },
    afternoonCheckInStatus: {
      type: String,
      enum: STATUS_VALUES,
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

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
