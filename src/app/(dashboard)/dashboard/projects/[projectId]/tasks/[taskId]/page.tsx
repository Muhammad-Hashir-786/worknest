import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgContext } from "~/lib/auth/current-org";
import { can } from "~/lib/permissions/permissions";
import { getProjectForOrg, getProjectMembers } from "~/services/project";
import { getTaskForOrg, getSubtasksForTask, getTasksForProject } from "~/services/task";
import { getCommentsForTask } from "~/services/comment";
import { getAttachmentsForTask } from "~/services/attachment";
import TaskEditForm from "./task-edit-form";
import Subtasks from "./subtasks";
import Comments from "./comments";
import Attachments from "./attachments";
import DeleteTaskForm from "./delete-task-form";
import TimeTracking from "./time-tracking";
import { getTimeEntriesForTask } from "~/services/time-entry";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ taskId: string }>;
}): Promise<Metadata> {
  const { taskId } = await params;
  return { title: `Task ${taskId} - WorkNest` };
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const { organization, role, user } = await requireOrgContext();

  const task = await getTaskForOrg(taskId, organization.id);
  // getTaskForOrg only returns a task that belongs to the caller's
  // organization; also confirm it belongs to *this* project in the URL,
  // since a task id is globally unique but the URL implies a specific
  // project - a stale/guessed URL with a mismatched projectId 404s here.
  if (!task || task.projectId !== projectId) notFound();

  const canManageAnyTask = can(role, "tasks:assign");
  const isOwnTask = task.assignee?.id === user.id;
  const canEdit = canManageAnyTask || (can(role, "tasks:update") && isOwnTask);
  const canDelete = can(role, "tasks:delete");
  const canComment = can(role, "tasks:comment");
  const canAttach = can(role, "tasks:attach");
  const canTrackTime = can(role, "tasks:trackTime") && (canManageAnyTask || isOwnTask);

  const [members, subtasks, comments, attachments, timeEntries, projectTasks] = await Promise.all([
    canManageAnyTask ? getProjectMembers(projectId) : Promise.resolve([]),
    getSubtasksForTask(taskId),
    getCommentsForTask(taskId, organization.id),
    getAttachmentsForTask(taskId, organization.id),
    getTimeEntriesForTask(taskId, organization.id),
    getTasksForProject(projectId, organization.id),
  ]);

  const project = await getProjectForOrg(projectId, organization.id);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href={`/dashboard/projects/${projectId}/tasks`} className="hover:text-neutral-700">
            {project?.name ?? "Project"} · Tasks
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{task.title}</h1>
        <p className="mt-1 text-xs text-neutral-400">
          Created by {task.createdBy?.name ?? "Unknown"} on {new Date(task.createdAt).toLocaleDateString()}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Time tracking</h2>
        <div className="mt-2"><TimeTracking taskId={taskId} projectId={projectId} entries={timeEntries} currentUserId={user.id} canTrack={canTrackTime} /></div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Task details</h2>
        <div className="mt-2">
          <TaskEditForm
            projectId={projectId}
            task={task}
            members={members}
            canEdit={canEdit}
            canReassign={canManageAnyTask}
            availableDependencies={projectTasks.filter((candidate) => candidate.id !== taskId).map((candidate) => ({ id: candidate.id, title: candidate.title }))}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Subtasks</h2>
        <div className="mt-2">
          <Subtasks taskId={taskId} subtasks={subtasks} canManage={canEdit} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Attachments</h2>
        <div className="mt-2">
          <Attachments
            taskId={taskId}
            projectId={projectId}
            attachments={attachments}
            currentUserId={user.id}
            canUpload={canAttach}
            canModerate={canDelete}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-900">Comments</h2>
        <div className="mt-2">
          <Comments
            taskId={taskId}
            projectId={projectId}
            comments={comments}
            currentUserId={user.id}
            canComment={canComment}
            canModerate={canDelete}
          />
        </div>
      </section>

      {canDelete && (
        <section className="border-t border-neutral-200 pt-6">
          <h2 className="text-sm font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-neutral-600">Deleting a task permanently removes it and its subtasks.</p>
          <div className="mt-2">
            <DeleteTaskForm taskId={task.id} projectId={projectId} taskTitle={task.title} />
          </div>
        </section>
      )}
    </div>
  );
}
