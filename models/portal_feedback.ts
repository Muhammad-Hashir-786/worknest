import mongoose from "mongoose";

const portalFeedbackSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  type: { type: String, enum: ["message", "approval"], required: true },
  message: { type: String, required: true, trim: true, maxlength: 1200 },
}, { timestamps: { createdAt: true, updatedAt: false } });

portalFeedbackSchema.index({ project: 1, createdAt: -1 });
export default mongoose.models.PortalFeedback || mongoose.model("PortalFeedback", portalFeedbackSchema);
