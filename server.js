// This is the main entry point. It sets up Express, connects the database,
// applies security middleware, mounts all routes, and starts listening.

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { startAttendanceCron } = require("./cron/attendanceCron");

const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const adminRoutes = require("./routes/adminRoutes");

connectDB();

// Make sure the upload folders actually exist before anything tries to write
// to them. This matters especially on hosting platforms like Render, where
// the filesystem can reset between deploys — an empty folder with just a
// .gitkeep file doesn't always survive that process, so we recreate it
// in code every time the server starts, just to be safe.
const uploadsDir = path.join(__dirname, "uploads");
const permissionsDir = path.join(__dirname, "uploads", "permissions");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created missing uploads/ directory");
}
if (!fs.existsSync(permissionsDir)) {
  fs.mkdirSync(permissionsDir, { recursive: true });
  console.log("Created missing uploads/permissions/ directory");
}

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api", employeeRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Attendance Management API is running" });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startAttendanceCron();
});
