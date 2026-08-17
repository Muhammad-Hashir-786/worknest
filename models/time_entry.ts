import mongoose from "mongoose";

const timeEntrySchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // seconds, computed on save/stop
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Auto-calculate duration when endedAt is set. Async pre-hooks can just
// throw instead of taking a next(err) callback - simpler and avoids
// fighting Mongoose's overload typing for pre("save", ...).
timeEntrySchema.pre("save", async function () {
  if (this.startedAt && this.endedAt) {
    if (this.endedAt.getTime() < this.startedAt.getTime()) {
      throw new Error("A time entry's endedAt cannot be before its startedAt.");
    }
    this.duration = Math.round(
      (this.endedAt.getTime() - this.startedAt.getTime()) / 1000
    );
  }
});

timeEntrySchema.index({ user: 1, startedAt: -1 });

export default mongoose.models.TimeEntry ||
  mongoose.model("TimeEntry", timeEntrySchema);