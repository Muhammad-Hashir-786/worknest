import mongoose from "mongoose";
import { ACTIVITY_ACTIONS } from "../lib/constants/roles";

const activityLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      enum: ACTIVITY_ACTIONS,
    },
    entityType: {
      type: String,
      required: true,
      enum: ["Task", "Project", "Client", "Comment", "Subtask", "Organization", "User"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // e.g. { from: "todo", to: "in_progress" }
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activityLogSchema.index({ organization: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);
