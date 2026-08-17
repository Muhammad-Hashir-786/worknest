import mongoose from "mongoose";
import { TASK_STATUS, PRIORITY } from "../lib/constants/roles";

const TasksSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: TASK_STATUS, required: true, default: "todo" },
    priority: { type: String, enum: PRIORITY, required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: { type: Date },
    estimatedHours: { type: Number },
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    recurrenceEndDate: { type: Date },
    recurrenceNextCreated: { type: Boolean, default: false },
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for the queries we actually run.
TasksSchema.index({ project: 1, status: 1 }); // tasks for a project, by status
TasksSchema.index({ organization: 1, status: 1 }); // tenant-aware queries
TasksSchema.index({ assignee: 1, status: 1 }); // "my tasks"
TasksSchema.index({ dueDate: 1, status: 1 }); // overdue tasks
TasksSchema.index({ project: 1, dueDate: 1 }); // calendar and agenda views

// Guard against task.organization drifting from its project's organization
// (e.g. project field gets reassigned to a project in a different org).
TasksSchema.pre("save", async function () {
  if (this.isModified("project") || this.isModified("organization")) {
    const Project = mongoose.models.Project || mongoose.model("Project");
    const project = await Project.findById(this.project).select("organization");

    if (!project) {
      throw new Error("Task references a project that does not exist.");
    }

    if (project.organization.toString() !== this.organization.toString()) {
      throw new Error("Task.organization must match the organization of Task.project.");
    }
  }
});

// Mongoose keeps models globally cached in development. When the schema grows
// during Fast Refresh, merge the new planning fields into an already-created
// model as well; otherwise populate("dependsOn") would still see yesterday's
// cached schema until the entire dev server is restarted.
const existingTask = mongoose.models.Task;
if (existingTask && !existingTask.schema.path("dependsOn")) {
  existingTask.schema.add({
    recurrence: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    recurrenceEndDate: { type: Date },
    recurrenceNextCreated: { type: Boolean, default: false },
    dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  });
}

const Task = existingTask || mongoose.model("Task", TasksSchema);

export default Task;
