import mongoose from "mongoose";

const savedViewSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    filters: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
    view: { type: String, enum: ["list", "board", "calendar"], required: true, default: "list" },
  },
  { timestamps: true }
);

savedViewSchema.index({ organization: 1, project: 1, user: 1, name: 1 }, { unique: true });
export default mongoose.models.SavedView || mongoose.model("SavedView", savedViewSchema);
