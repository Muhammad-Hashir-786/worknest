"use client";

import { useActionState } from "react";
import { createOrganization, type OrgActionState } from "~/actions/organization";
import { INDUSTRIES, COMPANY_SIZES } from "~/lib/constants/roles";

const initialState: OrgActionState = {};

export default function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="organization"
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {state.fieldErrors?.name && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-neutral-700">
          Industry
        </label>
        <select
          id="industry"
          name="industry"
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="" disabled>
            Select an industry
          </option>
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
          required
          defaultValue=""
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="" disabled>
            Select a size
          </option>
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

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Creating organization..." : "Create organization"}
      </button>
    </form>
  );
}
