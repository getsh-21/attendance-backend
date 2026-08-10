// This file configures Multer to handle profile picture uploads.

const multer = require("multer");
const path = require("path");

// Tell Multer where to save files and what to name them
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // saves into the /uploads folder
  },
  filename: function (req, file, cb) {
    // Example result: 64f1a2b3-1690000000000.jpg
    const uniqueName = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// Only allow image files, and cap the size at 2MB
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValidType = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (isValidType) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

module.exports = upload;