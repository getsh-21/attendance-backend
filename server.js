// This is the main entry point. It sets up Express, connects the database,
// applies security middleware, mounts all routes, and starts listening.

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { startAttendanceCron } = require("./cron/attendanceCron");

const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const adminRoutes = require("./routes/adminRoutes");

connectDB();

const app = express();

// Helmet sets safe HTTP headers, but by default it blocks cross-origin
// loading of images/files (Cross-Origin-Resource-Policy: same-origin).
// Since our frontend (port 5173) and backend (port 5000) are different
// origins, we need to relax this specifically so uploaded profile
// pictures can actually display in the browser.
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// Serve uploaded profile images as static files
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