import type { Metadata } from "next";
import CreateOrganizationForm from "./create-organization-form";

export const metadata: Metadata = { title: "Create organization - WorkNest" };

export default function CreateOrganizationPage() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 text-center text-2xl font-semibold text-neutral-900">
        Create your organization
      </h1>
      <p className="mb-6 text-center text-sm text-neutral-600">
        This is the workspace your team will work in. You can invite people
        once it&apos;s set up.
      </p>
      <CreateOrganizationForm />
    </div>
  );
}
