import { z } from "zod";

// Covers the "add a client" flow embedded in project creation. Full client
// management (edit, delete, notes, project history) is a dedicated
// milestone - this is intentionally just enough to unblock creating a
// project when the organization has no clients yet.
export const quickCreateClientSchema = z.object({
  name: z.string().trim().min(2, "Client name must be at least 2 characters").max(150),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
});

export type QuickCreateClientInput = z.infer<typeof quickCreateClientSchema>;

// Full create/edit form used by the dedicated Clients pages (Milestone 9).
export const clientSchema = z.object({
  name: z.string().trim().min(2, "Client name must be at least 2 characters").max(150),
  company: z.string().trim().max(150).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof clientSchema>;

// Allowlist for the client list's ?search= query param - same
// parse-with-.catch(undefined) pattern as projectFiltersSchema, so a bad
// query string just drops the filter instead of erroring the page.
export const clientFiltersSchema = z.object({
  search: z.string().trim().max(150).optional().catch(undefined),
});
