// This file builds an Excel file (.xlsx) from attendance records using ExcelJS.

const ExcelJS = require("exceljs");

// Takes an array of attendance records (already joined with employee info)
// and returns a workbook (Excel file in memory) ready to send to the browser.
const generateAttendanceExcel = async (records) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance Report");

  // Define column headers — matches the spec's required Excel columns
  sheet.columns = [
    { header: "Employee Name", key: "name", width: 20 },
    { header: "Department", key: "department", width: 15 },
    { header: "Position", key: "position", width: 15 },
    { header: "Morning Check-In", key: "morningCheckIn", width: 18 },
    { header: "Morning Status", key: "morningStatus", width: 15 },
    { header: "Morning Check-Out", key: "morningCheckOut", width: 18 },
    { header: "Afternoon Check-In", key: "afternoonCheckIn", width: 18 },
    { header: "Afternoon Status", key: "afternoonStatus", width: 15 },
    { header: "Afternoon Check-Out", key: "afternoonCheckOut", width: 18 },
    { header: "Attendance Date", key: "date", width: 15 },
    { header: "Generated Time", key: "generatedTime", width: 20 },
  ];

  // Make the header row bold so it stands out
  sheet.getRow(1).font = { bold: true };

  const generatedTime = new Date().toLocaleString();

  // Add one row per attendance record
  records.forEach((record) => {
    sheet.addRow({
      name: record.employee?.fullName || "Unknown",
      department: record.employee?.department || "N/A",
      position: record.employee?.position || "N/A",
      morningCheckIn: record.morningCheckIn ? new Date(record.morningCheckIn).toLocaleTimeString() : "-",
      morningStatus: record.morningStatus,
      morningCheckOut: record.morningCheckOut ? new Date(record.morningCheckOut).toLocaleTimeString() : "-",
      afternoonCheckIn: record.afternoonCheckIn ? new Date(record.afternoonCheckIn).toLocaleTimeString() : "-",
      afternoonStatus: record.afternoonStatus,
      afternoonCheckOut: record.afternoonCheckOut ? new Date(record.afternoonCheckOut).toLocaleTimeString() : "-",
      date: record.date,
      generatedTime,
    });
  });

  return workbook;
};

module.exports = { generateAttendanceExcel };