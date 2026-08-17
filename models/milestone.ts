import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    dueDate: { type: Date, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

milestoneSchema.index({ project: 1, dueDate: 1 });
export default mongoose.models.Milestone || mongoose.model("Milestone", milestoneSchema);
