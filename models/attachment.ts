import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    // Exactly one of task / project should be set - see validation below.
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    size: {
      type: Number, // bytes
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String, // reference to external storage (S3 key, etc.)
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Keep this simple: an attachment belongs to a task OR a project, not both, not neither.
attachmentSchema.pre("validate", async function () {
  const hasTask = !!this.task;
  const hasProject = !!this.project;

  if (hasTask === hasProject) {
    throw new Error("Attachment must reference exactly one of task or project.");
  }
});

attachmentSchema.index({ task: 1, createdAt: -1 });
attachmentSchema.index({ project: 1, createdAt: -1 });

export default mongoose.models.Attachment ||
  mongoose.model("Attachment", attachmentSchema);
