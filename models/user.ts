import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Stored as a bcrypt hash, never plaintext. select: false keeps it out of
    // default query results so it can't leak by accident - callers must
    // explicitly opt in with .select("+passwordHash") (see login action).
    passwordHash: { type: String, required: true, select: false },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/dxjv0gq1f/image/upload/v1690919825/avatars/default-avatar_owzq3r.png",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
