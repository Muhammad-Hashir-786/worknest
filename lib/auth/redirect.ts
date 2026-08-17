const DEFAULT_REDIRECT = "/dashboard";

/**
 * Validates a "next"/"redirectTo" value before ever passing it to
 * redirect(). This is untrusted client input (a query param the user - or
 * an attacker crafting a link - fully controls), so anything that isn't
 * unambiguously an in-app relative path falls back to the default instead
 * of being followed:
 *   - must start with exactly one "/"
 *   - "//evil.com" is rejected - browsers treat a leading "//" as
 *     protocol-relative, which would silently redirect off-site
 */
export function safeRedirectTarget(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string" || value.length === 0) return DEFAULT_REDIRECT;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_REDIRECT;
  return value;
}
