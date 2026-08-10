// This file sends emails using Nodemailer (e.g. for permission approvals).

const nodemailer = require("nodemailer");

// Creates a reusable "transporter" — the connection to your email provider
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for port 465, false for other ports like 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Sends an email. Returns true on success, false on failure (never crashes the app).
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    // We only log the error — a failed email should never crash the main request
    console.error("Email failed to send:", error.message);
    return false;
  }
};

module.exports = { sendEmail };