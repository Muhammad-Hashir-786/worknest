"use client";

import Link from "next/link";
import { useTransition } from "react";
import { changeTaskStatus } from "~/actions/task";
import { TASK_STATUS, type TaskStatus } from "~/lib/constants/roles";
import type { TaskSummary } from "~/services/task";
import TaskCard from "./task-card";

const statusLabels: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", in_review: "In review", completed: "Completed" };
const statusAccent: Record<TaskStatus, string> = { todo: "border-neutral-300", in_progress: "border-blue-300", in_review: "border-amber-300", completed: "border-emerald-300" };

export default function TaskWorkspace({ projectId, tasks, view, canMove }: { projectId: string; tasks: TaskSummary[]; view: "list" | "board" | "calendar"; canMove: boolean }) {
  if (view === "board") return <KanbanBoard projectId={projectId} tasks={tasks} canMove={canMove} />;
  if (view === "calendar") return <TaskCalendar projectId={projectId} tasks={tasks} />;
  return <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"><div className="divide-y divide-neutral-100">{tasks.map((task) => <TaskCard key={task.id} projectId={projectId} task={task} />)}</div></div>;
}

function KanbanBoard({ projectId, tasks, canMove }: { projectId: string; tasks: TaskSummary[]; canMove: boolean }) {
  const [, startTransition] = useTransition();
  function move(taskId: string, status: TaskStatus) {
    if (!canMove) return;
    const data = new FormData(); data.set("taskId", taskId); data.set("projectId", projectId); data.set("status", status);
    startTransition(() => { void changeTaskStatus({}, data); });
  }
  return <div className="grid min-w-[900px] grid-cols-4 gap-4">{TASK_STATUS.map((status) => {
    const column = tasks.filter((task) => task.status === status);
    return <section key={status} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(event.dataTransfer.getData("text/task-id"), status)} className={`min-h-72 rounded-2xl border-t-4 bg-neutral-50 p-3 ${statusAccent[status]}`}>
      <header className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-bold text-neutral-800">{statusLabels[status]}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-neutral-500">{column.length}</span></header>
      <div className="space-y-3">{column.map((task) => <article key={task.id} draggable={canMove} onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition hover:shadow-md">
        <Link href={`/dashboard/projects/${projectId}/tasks/${task.id}`} className="block text-sm font-semibold text-neutral-900 hover:text-[#d92d27]">{task.title}</Link>
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500"><span className={task.priority === "high" ? "font-semibold text-red-600" : "capitalize"}>{task.priority}</span>{task.dueDate ? <span className={task.isOverdue ? "font-semibold text-red-600" : ""}>{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span> : null}</div>
        {task.recurrence !== "none" && <span className="mt-2 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">{task.recurrence}</span>}
      </article>)}</div>
    </section>;
  })}</div>;
}

function TaskCalendar({ projectId, tasks }: { projectId: string; tasks: TaskSummary[] }) {
  const dated = tasks.filter((task) => task.dueDate).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const byDay = new Map<string, TaskSummary[]>();
  for (const task of dated) { const key = new Date(task.dueDate!).toISOString().slice(0, 10); byDay.set(key, [...(byDay.get(key) ?? []), task]); }
  return <div className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#d92d27]">Schedule</p><h2 className="mt-1 font-bold text-neutral-900">Task calendar</h2></div><span className="text-sm text-neutral-500">{dated.length} dated tasks</span></div>{byDay.size === 0 ? <p className="rounded-xl bg-neutral-50 p-8 text-center text-sm text-neutral-500">Add due dates to see your project schedule here.</p> : <div className="space-y-4">{[...byDay].map(([day, dayTasks]) => <div key={day} className="grid grid-cols-[92px_1fr] gap-4 border-t border-neutral-100 pt-4 first:border-t-0 first:pt-0"><div className="text-sm font-bold text-neutral-800"><time dateTime={day}>{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time><span className="mt-0.5 block text-xs font-normal text-neutral-400">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })}</span></div><div className="flex flex-wrap gap-2">{dayTasks.map((task) => <Link key={task.id} href={`/dashboard/projects/${projectId}/tasks/${task.id}`} className={`rounded-lg border px-3 py-2 text-sm font-medium ${task.isOverdue ? "border-red-200 bg-red-50 text-red-800" : "border-neutral-200 bg-neutral-50 text-neutral-700"}`}>{task.title}</Link>)}</div></div>)}</div>}</div>;
}
