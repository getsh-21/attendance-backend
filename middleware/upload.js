// This file configures Multer for TWO different upload types:
// 1) Profile pictures (images only, small size limit)
// 2) Permission documents like medical certificates (images or PDF, larger limit)

const multer = require("multer");
const path = require("path");

// --- Profile picture upload config ---
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const profileFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValidType = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  if (isValidType) cb(null, true);
  else cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"));
};

const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: profileFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

// --- Permission document upload config (e.g. medical certificates) ---
const permissionStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/permissions/"),
  filename: (req, file, cb) => {
    const uniqueName = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const permissionFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const isValidType = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  if (isValidType) cb(null, true);
  else cb(new Error("Only image or PDF files are allowed"));
};

const uploadPermissionFile = multer({
  storage: permissionStorage,
  fileFilter: permissionFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = { uploadProfileImage, uploadPermissionFile };
