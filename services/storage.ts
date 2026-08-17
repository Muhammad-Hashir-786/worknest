import "server-only";
import { randomUUID } from "node:crypto";
import { writeFile, unlink, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Storage lives outside `public/` and outside the Next.js `src/app` tree so
 * files are never served as static assets - every download goes through the
 * authenticated route handler at /api/attachments/[id]/download, which
 * re-verifies the caller's organization membership before streaming any
 * bytes back.
 *
 * This is a local-disk implementation, used because no external storage
 * credentials (S3, etc.) are available for this submission - per the
 * project spec, it's kept behind this same three-function interface so a
 * real object store can be swapped in later without touching any caller.
 */
const STORAGE_ROOT = path.join(process.cwd(), ".uploads");

export interface StoredFile {
  storageKey: string;
}

export async function saveFile(buffer: Buffer, originalName: string): Promise<StoredFile> {
  await mkdir(STORAGE_ROOT, { recursive: true });

  // The stored filename is entirely our own generation - never derived from
  // user input beyond the extension, so there's nothing in `originalName`
  // that can influence where on disk this ends up.
  const extension = path.extname(originalName).slice(0, 20);
  const storageKey = `${randomUUID()}${extension}`;

  await writeFile(path.join(STORAGE_ROOT, storageKey), buffer);
  return { storageKey };
}

export async function readFileByKey(storageKey: string): Promise<Buffer> {
  return readFile(safeStoragePath(storageKey));
}

export async function deleteFileByKey(storageKey: string): Promise<void> {
  try {
    await unlink(safeStoragePath(storageKey));
  } catch (error) {
    // Already gone (deleted twice, disk cleared, etc.) - the end state
    // (file absent) is what we wanted, so this isn't worth surfacing.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

// storageKey is always one we generated ourselves (see saveFile), never
// taken directly from a request, but this still guards against a
// malformed or legacy key ever resolving outside STORAGE_ROOT.
function safeStoragePath(storageKey: string): string {
  const resolved = path.join(STORAGE_ROOT, storageKey);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return resolved;
}
