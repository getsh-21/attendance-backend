// This defines what an Employee/Admin record looks like in the database.

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // no two users can share an email
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8 },
    department: { type: String, required: true },
    position: { type: String, required: true },
    role: {
      type: String,
      enum: ["employee", "admin"], // only these two values allowed
      default: "employee",
    },
    profileImage: { type: String, default: "" }, // file path from Multer
    isActive: { type: Boolean, default: true }, // used for "Disable Employee"
    joinedDate: { type: Date, default: Date.now },
    // Used for the "forgot password" email flow
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// Before saving a user, hash their password so it's never stored in plain text
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // skip if password unchanged
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compares a typed-in password to the hashed one in the database
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);