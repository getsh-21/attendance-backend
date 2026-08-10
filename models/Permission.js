// This defines a leave/permission request submitted by an employee.

const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    position: { type: String, required: true },
    permissionType: {
      type: String,
      enum: ["Sick Leave", "Annual Leave", "Emergency", "Official Duty", "Personal"],
      required: true,
    },
    reason: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    adminRemarks: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Permission", permissionSchema);