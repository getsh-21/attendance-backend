// This file builds an Excel file (.xlsx) from attendance records using ExcelJS.
// Updated to include all 4 separate check-in/check-out statuses.

const ExcelJS = require("exceljs");

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
    { header: "Generated Time", key: "generatedTime", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };

  const generatedTime = new Date().toLocaleString();

  records.forEach((record) => {
    sheet.addRow({
      name: record.employee?.fullName || "Unknown",
      department: record.employee?.department || "N/A",
      position: record.employee?.position || "N/A",
      morningCheckIn: record.morningCheckIn
        ? new Date(record.morningCheckIn).toLocaleTimeString()
        : "-",
      morningCheckInStatus: record.morningCheckInStatus,
      morningCheckOut: record.morningCheckOut
        ? new Date(record.morningCheckOut).toLocaleTimeString()
        : "-",
      morningCheckOutStatus: record.morningCheckOutStatus,
      afternoonCheckIn: record.afternoonCheckIn
        ? new Date(record.afternoonCheckIn).toLocaleTimeString()
        : "-",
      afternoonCheckInStatus: record.afternoonCheckInStatus,
      afternoonCheckOut: record.afternoonCheckOut
        ? new Date(record.afternoonCheckOut).toLocaleTimeString()
        : "-",
      afternoonCheckOutStatus: record.afternoonCheckOutStatus,
      date: record.date,
      generatedTime,
    });
  });

  return workbook;
};

module.exports = { generateAttendanceExcel };
