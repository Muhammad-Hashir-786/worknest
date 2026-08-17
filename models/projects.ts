import mongoose from "mongoose";
import { PROJECT_STATUS, PRIORITY } from "../lib/constants/roles";

const ProjectSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: PROJECT_STATUS, required: true, default: "planning" },
    priority: { type: String, enum: PRIORITY, required: true },
    startDate: { type: Date, required: true },
    deadline: { type: Date, required: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    budget: { type: Number, min: 0, default: 0 },
    hourlyRate: { type: Number, min: 0, default: 0 },
    clientPortalEnabled: { type: Boolean, default: false },
    clientPortalToken: { type: String, select: false, index: true },
  },
  {
    timestamps: true,
  }
);

ProjectSchema.index({ organization: 1, status: 1 });

const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);

export default Project;
