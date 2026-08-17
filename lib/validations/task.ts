import { z } from "zod";
import { TASK_STATUS, PRIORITY } from "../../lib/constants/roles";

// Same pattern as lib/validations/project.ts: keep the raw value a string
// until parse-time so an empty/invalid date is a field error, not a thrown
// exception from new Date("").
const optionalDateString = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    "Enter a valid date"
  );

// "" means unassigned - kept as a plain string (not nullable) because it
// comes straight off a <select>, and turned into `undefined` for Mongoose
// in the service layer.
const assigneeId = z.string().trim().optional().or(z.literal(""));
export const RECURRENCE_OPTIONS = ["none", "daily", "weekly", "monthly"] as const;
const dependencyIds = z.string().trim().optional().or(z.literal(""));

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  priority: z.enum(PRIORITY, { message: "Select a priority" }),
  assignee: assigneeId,
  dueDate: optionalDateString,
  estimatedHours: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "Enter a positive number of hours"
    ),
  recurrence: z.enum(RECURRENCE_OPTIONS).optional().default("none"),
  recurrenceEndDate: optionalDateString,
  dependsOn: dependencyIds,
});

export const updateTaskSchema = createTaskSchema.extend({
  status: z.enum(TASK_STATUS, { message: "Select a status" }),
});

// Bound to the quick status-change control on the task detail page - a
// narrower schema than updateTaskSchema because it changes nothing else.
export const changeTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUS, { message: "Select a status" }),
});

export const taskFiltersSchema = z.object({
  status: z.enum(TASK_STATUS).optional().catch(undefined),
  priority: z.enum(PRIORITY).optional().catch(undefined),
  // "me" is a sentinel resolved against the current user server-side, not a
  // real ObjectId - see getTasksForProject's filters.assignee handling.
  assignee: z.string().trim().optional().catch(undefined),
  search: z.string().trim().max(150).optional().catch(undefined),
});

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, "Subtask title is required").max(200),
});

export const toggleSubtaskSchema = z.object({
  subtaskId: z.string().trim().min(1),
  completed: z.enum(["true", "false"]),
});

export const deleteSubtaskSchema = z.object({
  subtaskId: z.string().trim().min(1),
});

// "up" moves a subtask earlier in the list, "down" moves it later - swaps
// `position` with its neighbour rather than a full drag-and-drop reorder.
export const moveSubtaskSchema = z.object({
  subtaskId: z.string().trim().min(1),
  direction: z.enum(["up", "down"]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
