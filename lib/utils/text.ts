/**
 * Escapes regex special characters so user-supplied search text can be
 * safely interpolated into a MongoDB $regex query. Without this, a search
 * term containing characters like `(`, `*`, or `.` would either throw or
 * silently match more than the user typed.
 */
export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
