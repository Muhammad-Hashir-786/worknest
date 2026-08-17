import "server-only";
import { randomBytes } from "crypto";

/**
 * 32 bytes of CSPRNG output, hex-encoded (64 chars). Used as the opaque,
 * unguessable invitation token embedded in invite links - knowledge of the
 * token is what grants access to the invite page, so it must not be
 * predictable from the invitation's other fields (email, org, timestamp).
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
