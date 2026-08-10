// This defines a single notification sent to an employee.

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["Permission Approved", "Permission Rejected", "Late Reminder", "Absent Notice", "General"],
      default: "General",
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);