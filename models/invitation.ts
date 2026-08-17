import mongoose from "mongoose";
import { INVITABLE_ROLES, INVITATION_STATUS } from "../lib/constants/roles";

const invitationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    // Note: intentionally NOT ORG_ROLES - you can't invite someone as "owner".
    role: { type: String, required: true, enum: INVITABLE_ROLES },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: INVITATION_STATUS,
      default: "pending",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // gives us createdAt + updatedAt, consistent with other models
  }
);

export default mongoose.models.Invitation ||
  mongoose.model("Invitation", invitationSchema);
