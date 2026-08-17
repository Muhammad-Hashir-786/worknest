import "server-only";
import connectDB from "../../lib/db";
import Organization from "../../models/organization";

/**
 * Converts a human-entered name into a URL-safe slug fragment. This alone
 * does not guarantee uniqueness - see generateUniqueSlug for that.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "org";
}

/**
 * Slugifies `name` and appends a numeric suffix (-2, -3, ...) until the
 * result doesn't collide with an existing organization. Organization.slug
 * also has a unique index as a last-resort safety net against a race
 * between this check and the insert.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  await connectDB();

  const base = slugify(name);
  let slug = base;
  let suffix = 1;

  while (await Organization.exists({ slug })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  return slug;
}
