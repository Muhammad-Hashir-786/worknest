import { z } from "zod";
import { INDUSTRIES, COMPANY_SIZES } from "../../lib/constants/roles";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  industry: z.enum(INDUSTRIES, { message: "Select an industry" }),
  companySize: z.enum(COMPANY_SIZES, { message: "Select a company size" }),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  industry: z.enum(INDUSTRIES, { message: "Select an industry" }),
  companySize: z.enum(COMPANY_SIZES, { message: "Select a company size" }),
  // Kept as a plain (non-empty-validated) string rather than z.string().url() -
  // logos are optional and we'd rather accept a slightly odd value than block
  // someone from saving the rest of the form over a strict URL check.
  logo: z.string().trim().max(500).optional().or(z.literal("")),
  joinRequestsEnabled: z.boolean().default(true),
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().trim().min(1, "organizationId is required"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
