// This file checks if express-validator found any errors in the request,
// and if so, stops the request early with a clear error message.

const { validationResult } = require("express-validator");

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }

  next(); // no errors, continue to the controller
};

module.exports = { validateRequest };