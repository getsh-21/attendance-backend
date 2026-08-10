// This file catches errors from anywhere in the app and sends back a clean,
// consistent JSON response instead of crashing the server or leaking stack traces.

const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // log full error in terminal for debugging

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
  });
};

// Handles requests to routes that don't exist (e.g. typo in URL)
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

module.exports = { errorHandler, notFound };