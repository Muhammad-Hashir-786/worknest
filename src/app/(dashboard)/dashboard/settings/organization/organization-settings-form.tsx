"use client";

import { useActionState } from "react";
import { updateOrganization, type OrgActionState } from "~/actions/organization";
import { INDUSTRIES, COMPANY_SIZES } from "~/lib/constants/roles";

const initialState: OrgActionState = {};

interface OrganizationFields {
  name: string;
  industry: string;
  companySize: string;
  logo: string;
  joinRequestsEnabled: boolean;
}

export default function OrganizationSettingsForm({
  organization,
  canEdit,
}: {
  organization: OrganizationFields;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateOrganization, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={!canEdit} className="space-y-4 disabled:opacity-60">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={organization.name}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3"><input name="joinRequestsEnabled" type="checkbox" defaultChecked={organization.joinRequestsEnabled} className="mt-1 h-4 w-4 accent-[#d92d27]" /><span><span className="block text-sm font-semibold text-neutral-800">Allow join requests</span><span className="mt-0.5 block text-xs leading-5 text-neutral-500">Let people find this organization by name and request access. Owners and admins still approve every request.</span></span></label>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-neutral-700">
            Industry
          </label>
          <select
            id="industry"
            name="industry"
            defaultValue={organization.industry}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
          {state.fieldErrors?.industry && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.industry}</p>
          )}
        </div>

        <div>
          <label htmlFor="companySize" className="block text-sm font-medium text-neutral-700">
            Company size
          </label>
          <select
            id="companySize"
            name="companySize"
            defaultValue={organization.companySize}
            required
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} employees
              </option>
            ))}
          </select>
          {state.fieldErrors?.companySize && (
            <p className="mt-1 text-sm text-red-600">{state.fieldErrors.companySize}</p>
          )}
        </div>

        <div>
          <label htmlFor="logo" className="block text-sm font-medium text-neutral-700">
            Logo URL
          </label>
          <input
            id="logo"
            name="logo"
            type="text"
            defaultValue={organization.logo}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
      </fieldset>

      {!canEdit && (
        <p className="text-sm text-neutral-500">
          Only owners and admins can edit organization settings.
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Saved.</p>}

      {canEdit && (
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      )}
    </form>
  );
}
