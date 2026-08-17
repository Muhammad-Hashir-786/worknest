import mongoose from "mongoose";
import { PROJECT_MEMBER_ROLES } from "../lib/constants/roles";

const ProjectMembersSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: PROJECT_MEMBER_ROLES, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// A user can only be a member of a given project once.
ProjectMembersSchema.index({ project: 1, user: 1 }, { unique: true });

const ProjectMember =
  mongoose.models.ProjectMember ||
  mongoose.model("ProjectMember", ProjectMembersSchema);

export default ProjectMember;
