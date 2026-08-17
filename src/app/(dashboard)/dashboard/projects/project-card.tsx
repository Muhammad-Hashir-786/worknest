import Link from "next/link";
import type { ProjectSummary } from "~/services/project";
import StatusBadge from "~/components/ui/status-badge";

const PRIORITY_STYLES: Record<string, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-neutral-500",
};

export default function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="worknest-panel block rounded-2xl border border-neutral-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-neutral-900">{project.name}</h3>
        <StatusBadge value={project.status} />
      </div>

      <p className="mt-1 text-sm text-neutral-500">
        {project.client ? project.client.name : "No client"}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
        <span className={`font-medium ${PRIORITY_STYLES[project.priority]}`}>
          {project.priority} priority
        </span>
        <span className={project.isOverdue ? "font-medium text-red-600" : ""}>
          Due {new Date(project.deadline).toLocaleDateString()}
        </span>
      </div>

      <p className="mt-2 text-xs text-neutral-400">
        {project.memberCount} member{project.memberCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
