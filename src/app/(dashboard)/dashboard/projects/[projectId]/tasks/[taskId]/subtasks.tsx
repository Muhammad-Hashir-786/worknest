"use client";

import { useActionState, useTransition } from "react";
import {
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  moveSubtask,
  reorderSubtask,
  type TaskActionState,
} from "~/actions/task";
import type { SubtaskSummary } from "~/services/task";

const initialState: TaskActionState = {};

export default function Subtasks({
  taskId,
  subtasks,
  canManage,
}: {
  taskId: string;
  subtasks: SubtaskSummary[];
  canManage: boolean;
}) {
  const [, startTransition] = useTransition();
  function reorder(subtaskId: string, targetIndex: number) {
    const data = new FormData(); data.set("taskId", taskId); data.set("subtaskId", subtaskId); data.set("targetIndex", String(targetIndex));
    startTransition(() => { void reorderSubtask({}, data); });
  }
  return (
    <div className="space-y-3">
      {subtasks.length === 0 ? (
        <p className="text-sm text-neutral-500">No subtasks yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
          {subtasks.map((subtask, index) => (
            <SubtaskRow
              key={subtask.id}
              taskId={taskId}
              subtask={subtask}
              canManage={canManage}
              index={index}
              onReorder={reorder}
              isFirst={index === 0}
              isLast={index === subtasks.length - 1}
            />
          ))}
        </ul>
      )}

      {canManage && <AddSubtaskForm taskId={taskId} />}
    </div>
  );
}

function SubtaskRow({
  taskId,
  subtask,
  canManage,
  isFirst,
  isLast,
  index,
  onReorder,
}: {
  taskId: string;
  subtask: SubtaskSummary;
  canManage: boolean;
  isFirst: boolean;
  isLast: boolean;
  index: number;
  onReorder: (subtaskId: string, targetIndex: number) => void;
}) {
  const [toggleState, toggleAction] = useActionState(toggleSubtask, initialState);
  const [, moveAction] = useActionState(moveSubtask, initialState);
  const [, deleteAction] = useActionState(deleteSubtask, initialState);

  return (
    <li draggable={canManage} onDragStart={(event) => event.dataTransfer.setData("text/subtask-id", subtask.id)} onDragOver={(event) => { if (canManage) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); const dragged = event.dataTransfer.getData("text/subtask-id"); if (dragged && dragged !== subtask.id) onReorder(dragged, index); }} className="flex items-center gap-3 px-3 py-2 transition hover:bg-neutral-50">
      {canManage && <span className="cursor-grab text-neutral-300" title="Drag to reorder" aria-hidden>⋮⋮</span>}
      <form action={toggleAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="subtaskId" value={subtask.id} />
        <input type="hidden" name="completed" value={(!subtask.completed).toString()} />
        <button
          type="submit"
          disabled={!canManage}
          aria-label={subtask.completed ? "Mark incomplete" : "Mark complete"}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            subtask.completed
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-300 bg-white"
          } disabled:opacity-50`}
        >
          {subtask.completed && "✓"}
        </button>
      </form>

      <span className={`flex-1 text-sm ${subtask.completed ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
        {subtask.title}
      </span>
      {toggleState.error && <span className="text-xs text-red-600">{toggleState.error}</span>}

      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <form action={moveAction}>
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="subtaskId" value={subtask.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
              aria-label="Move up"
            >
              ↑
            </button>
          </form>
          <form action={moveAction}>
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="subtaskId" value={subtask.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
              aria-label="Move down"
            >
              ↓
            </button>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="subtaskId" value={subtask.id} />
            <button
              type="submit"
              className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50"
              aria-label="Delete subtask"
            >
              ✕
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

function AddSubtaskForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState(createSubtask, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <input
        name="title"
        type="text"
        placeholder="Add a subtask..."
        required
        className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add"}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
      {state.fieldErrors?.title && <span className="text-xs text-red-600">{state.fieldErrors.title}</span>}
    </form>
  );
}
