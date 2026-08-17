import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "~/lib/auth/current-user";
import { resolveInvitationToken } from "~/services/invitation";
import { acceptInvitationAction } from "~/actions/invitation";
import { logout } from "~/actions/auth";

export const metadata: Metadata = { title: "Accept invitation - WorkNest" };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await resolveInvitationToken(token);

  if (!invitation) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-neutral-900">Invitation not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This invite link is invalid or has expired. Ask whoever invited you to send a new one.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium underline">
          Go to dashboard
        </Link>
      </Shell>
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    const nextParam = encodeURIComponent(`/invite/${token}`);
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-neutral-900">
          You&apos;ve been invited to {invitation.organizationName}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          As <strong>{invitation.role}</strong>. Sign in or create an account with{" "}
          <strong>{invitation.email}</strong> to accept.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/signup?next=${nextParam}`}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Create account
          </Link>
          <Link
            href={`/login?next=${nextParam}`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Log in
          </Link>
        </div>
      </Shell>
    );
  }

  if (user.email !== invitation.email) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-neutral-900">Wrong account</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This invitation was sent to <strong>{invitation.email}</strong>, but you&apos;re signed in
          as <strong>{user.email}</strong>. Log out and sign in with the invited email to accept.
        </p>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Log out
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-neutral-900">
        Join {invitation.organizationName}
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        You&apos;re invited as <strong>{invitation.role}</strong>. Accepting will add{" "}
        {invitation.email} to this organization.
      </p>
      <form action={acceptInvitationAction} className="mt-4">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Accept invitation
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6">
        {children}
      </div>
    </div>
  );
}
