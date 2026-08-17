"use client";

import { deleteTask } from "~/actions/task";

export default function DeleteTaskForm({
  taskId,
  projectId,
  taskTitle,
}: {
  taskId: string;
  projectId: string;
  taskTitle: string;
}) {
  function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!confirm(`Delete "${taskTitle}"? This cannot be undone.`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteTask} onSubmit={confirmDelete}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="projectId" value={projectId} />
      <button
        type="submit"
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Delete task
      </button>
    </form>
  );
}
