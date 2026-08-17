import { NextResponse } from "next/server";
import { getCurrentOrgContext } from "~/lib/auth/current-org";
import { getAttachmentForDownload } from "~/services/attachment";
import { readFileByKey } from "~/services/storage";

/**
 * A route handler rather than a server action, since this needs to stream
 * binary bytes with real content headers - not something a form action can
 * return. It also can't reuse requireOrgContext() (which redirects on
 * failure): a fetch/download request can't follow a redirect() the way a
 * page navigation can, so failures here return real 401/404 responses.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;

  const context = await getCurrentOrgContext();
  if (!context || !context.organization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attachment = await getAttachmentForDownload(attachmentId);

  // Same 404 whether the attachment doesn't exist or belongs to another
  // organization entirely - this IS the object-level authorization check
  // the "never trust an id from the client" rule exists for, and it
  // shouldn't leak which case it was.
  if (!attachment || attachment.organizationId !== context.organization.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFileByKey(attachment.storageKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(attachment.name)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
