import mongoose from "mongoose";

const notificationPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true },
  taskAssignments: { type: Boolean, default: true },
  statusChanges: { type: Boolean, default: true },
  comments: { type: Boolean, default: true },
  deadlines: { type: Boolean, default: true },
  emailUpdates: { type: Boolean, default: false },
}, { timestamps: true });

notificationPreferenceSchema.index({ user: 1, organization: 1 }, { unique: true });
export default mongoose.models.NotificationPreference || mongoose.model("NotificationPreference", notificationPreferenceSchema);
