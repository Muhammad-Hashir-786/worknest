import { redirect } from "next/navigation";
import { getCurrentUser } from "~/lib/auth/current-user";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding only requires a logged-in user, not an active organization
  // (picking/creating one is the whole point of this section) - so this
  // checks getCurrentUser directly rather than requireOrgContext.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      {children}
    </div>
  );
}
