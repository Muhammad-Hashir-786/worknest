import mongoose from "mongoose";
import { ORG_ROLES } from "../lib/constants/roles";

const userOrganizationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: { type: String, required: true, enum: ORG_ROLES },
    joinedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// A user can only belong to a given organization once.
userOrganizationSchema.index({ user: 1, organization: 1 }, { unique: true });

const UserOrganization =
  mongoose.models.UserOrganization ||
  mongoose.model("UserOrganization", userOrganizationSchema);

export default UserOrganization;
