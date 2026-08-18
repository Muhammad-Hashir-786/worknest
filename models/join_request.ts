import mongoose from "mongoose";

const joinRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  message: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
}, { timestamps: true });
joinRequestSchema.index({ user: 1, organization: 1, status: 1 });
export default mongoose.models.JoinRequest || mongoose.model("JoinRequest", joinRequestSchema);
