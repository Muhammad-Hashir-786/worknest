import mongoose from "mongoose";
import { PRIORITY } from "../lib/constants/roles";

const taskTemplateSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },
    priority: { type: String, enum: PRIORITY, default: "medium" },
    estimatedHours: { type: Number },
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
  },
  { timestamps: true }
);

taskTemplateSchema.index({ organization: 1, project: 1, name: 1 }, { unique: true });
export default mongoose.models.TaskTemplate || mongoose.model("TaskTemplate", taskTemplateSchema);
