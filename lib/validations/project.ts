import { z } from "zod";
import { PROJECT_STATUS, PRIORITY, PROJECT_MEMBER_ROLES } from "../../lib/constants/roles";

// Plain string field validated as a parseable date rather than z.coerce.date() -
// coerce would accept things like empty-string-becomes-epoch in odd ways.
// Keeping it a string until this point makes the "is this even a date"
// failure explicit and gives a field-level error instead of a thrown 500.
const dateString = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date");

// clientId is either a real ObjectId string selected from the dropdown, or
// the sentinel "__new__" meaning "create a client alongside this project".
// See newClientName below and createProject in actions/project.ts.
export const NEW_CLIENT_VALUE = "__new__";

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
    description: z.string().trim().min(1, "Description is required").max(2000),
    priority: z.enum(PRIORITY, { message: "Select a priority" }),
    startDate: dateString,
    deadline: dateString,
    clientId: z.string().trim().min(1, "Select a client"),
    newClientName: z.string().trim().max(150).optional().or(z.literal("")),
    newClientCompany: z.string().trim().max(150).optional().or(z.literal("")),
    newClientEmail: z.string().trim().max(200).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.deadline) >= new Date(data.startDate), {
    message: "Deadline must be on or after the start date",
    path: ["deadline"],
  })
  .refine(
    (data) =>
      data.clientId !== NEW_CLIENT_VALUE ||
      (data.newClientName && data.newClientName.trim().length >= 2),
    {
      message: "Enter a name for the new client",
      path: ["newClientName"],
    }
  )
  .refine(
    (data) => !data.newClientEmail || z.string().trim().email().safeParse(data.newClientEmail).success,
    {
      message: "Enter a valid email",
      path: ["newClientEmail"],
    }
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
    description: z.string().trim().min(1, "Description is required").max(2000),
    status: z.enum(PROJECT_STATUS, { message: "Select a status" }),
    priority: z.enum(PRIORITY, { message: "Select a priority" }),
    startDate: dateString,
    deadline: dateString,
    clientId: z.string().trim().min(1, "Select a client"),
  })
  .refine((data) => new Date(data.deadline) >= new Date(data.startDate), {
    message: "Deadline must be on or after the start date",
    path: ["deadline"],
  });

export const addProjectMemberSchema = z.object({
  userId: z.string().trim().min(1, "Select a team member"),
  role: z.enum(PROJECT_MEMBER_ROLES, { message: "Select a role" }),
});

export const removeProjectMemberSchema = z.object({
  membershipId: z.string().trim().min(1, "membershipId is required"),
});

// Allowlist for the project list's ?status=&priority=&search= query params.
// Parsed with .catch(undefined) rather than surfaced as a form error - an
// invalid/stale filter in the URL should just be dropped, not break the page.
export const projectFiltersSchema = z.object({
  status: z
    .enum(PROJECT_STATUS)
    .optional()
    .catch(undefined),
  priority: z
    .enum(PRIORITY)
    .optional()
    .catch(undefined),
  search: z.string().trim().max(150).optional().catch(undefined),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
