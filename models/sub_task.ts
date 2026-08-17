import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

subtaskSchema.index({ task: 1, position: 1 });

export default mongoose.models.Subtask || mongoose.model("Subtask", subtaskSchema);