"use client";

import { deleteProject } from "~/actions/project";

export default function DeleteProjectForm({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Delete "${projectName}"? This cannot be undone.`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteProject} onSubmit={confirmDelete}>
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete project
      </button>
    </form>
  );
}
