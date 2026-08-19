// This file builds an Excel file (.xlsx) from attendance records using ExcelJS.
// Times are formatted in East Africa Time (EAT, UTC+3) explicitly - using
// the SAME formatTime24 function the rest of the backend uses to enforce
// and display check-in/checkout windows. Previously this used
// toLocaleTimeString(), which reads the SERVER's own timezone (UTC on
// Render) - causing the exported time to be 3 hours off from what the
// employee actually saw when they checked in.

const ExcelJS = require("exceljs");
const { formatTime24 } = require("../utils/attendanceRules");

const generateAttendanceExcel = async (records) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance Report");

  sheet.columns = [
    { header: "Employee Name", key: "name", width: 20 },
    { header: "Department", key: "department", width: 15 },
    { header: "Position", key: "position", width: 15 },
    { header: "Morning Check-In", key: "morningCheckIn", width: 16 },
    { header: "Morning In Status", key: "morningCheckInStatus", width: 16 },
    { header: "Morning Check-Out", key: "morningCheckOut", width: 16 },
    { header: "Morning Out Status", key: "morningCheckOutStatus", width: 16 },
    { header: "Afternoon Check-In", key: "afternoonCheckIn", width: 16 },
    { header: "Afternoon In Status", key: "afternoonCheckInStatus", width: 16 },
    { header: "Afternoon Check-Out", key: "afternoonCheckOut", width: 16 },
    {
      header: "Afternoon Out Status",
      key: "afternoonCheckOutStatus",
      width: 16,
    },
    { header: "Attendance Date", key: "date", width: 15 },
    { header: "Generated Time (EAT)", key: "generatedTime", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };

  // The "Generated Time" also needs to use EAT, not the server's own clock
  const generatedTime = formatTime24(new Date());

  records.forEach((record) => {
    sheet.addRow({
      name: record.employee?.fullName || "Unknown",
      department: record.employee?.department || "N/A",
      position: record.employee?.position || "N/A",
      morningCheckIn: record.morningCheckIn
        ? formatTime24(new Date(record.morningCheckIn))
        : "-",
      morningCheckInStatus: record.morningCheckInStatus,
      morningCheckOut: record.morningCheckOut
        ? formatTime24(new Date(record.morningCheckOut))
        : "-",
      morningCheckOutStatus: record.morningCheckOutStatus,
      afternoonCheckIn: record.afternoonCheckIn
        ? formatTime24(new Date(record.afternoonCheckIn))
        : "-",
      afternoonCheckInStatus: record.afternoonCheckInStatus,
      afternoonCheckOut: record.afternoonCheckOut
        ? formatTime24(new Date(record.afternoonCheckOut))
        : "-",
      afternoonCheckOutStatus: record.afternoonCheckOutStatus,
      date: record.date,
      generatedTime,
    });
  });

  return workbook;
};

module.exports = { generateAttendanceExcel };
