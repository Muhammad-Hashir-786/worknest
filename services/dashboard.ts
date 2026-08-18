import "server-only";
import connectDB from "~/lib/db";
import Project from "~/models/projects";
import Task from "~/models/tasks";
import UserOrganization from "~/models/user_organization";

export interface DashboardData {
  totalProjects: number; activeProjects: number; totalTasks: number; completedTasks: number;
  overdueTasks: number; memberCount: number; taskDistribution: { status: string; count: number }[];
  upcomingTasks: {
    id: string; title: string; projectId: string; projectName: string;
    dueDate: Date; status: string; priority: string; isOverdue: boolean;
  }[];
  projectHealth: {
    id: string; name: string; status: string; deadline: Date;
    totalTasks: number; completedTasks: number; overdueTasks: number; progress: number;
  }[];
}

export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  await connectDB();
  const now = new Date();
  const [totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, memberCount, distribution, upcoming, projects] = await Promise.all([
    Project.countDocuments({ organization: organizationId }),
    Project.countDocuments({ organization: organizationId, status: "active" }),
    Task.countDocuments({ organization: organizationId }),
    Task.countDocuments({ organization: organizationId, status: "completed" }),
    Task.countDocuments({ organization: organizationId, status: { $ne: "completed" }, dueDate: { $lt: now } }),
    UserOrganization.countDocuments({ organization: organizationId }),
    Task.aggregate<{ _id: string; count: number }>([
      { $match: { organization: organizationId } }, { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.find({ organization: organizationId, status: { $ne: "completed" }, dueDate: { $exists: true } })
      .populate("project", "name")
      .sort({ dueDate: 1 })
      .limit(6)
      .lean(),
    Project.find({ organization: organizationId, status: { $nin: ["completed", "archived"] } })
      .sort({ deadline: 1 })
      .limit(6)
      .lean(),
  ]);

  const projectIds = projects.map((project) => project._id);
  const projectTaskCounts = await Task.aggregate<{ _id: string; total: number; completed: number; overdue: number }>([
    { $match: { organization: organizationId, project: { $in: projectIds } } },
    { $group: {
      _id: "$project",
      total: { $sum: 1 },
      completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      overdue: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "completed"] }, { $lt: ["$dueDate", now] }] }, 1, 0] } },
    } },
  ]);
  const countsByProject = new Map(projectTaskCounts.map((row) => [String(row._id), row]));

  return {
    totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, memberCount,
    taskDistribution: distribution.map((row) => ({ status: row._id, count: row.count })),
    upcomingTasks: upcoming.map((task) => {
      const project = task.project as unknown as { _id: { toString(): string }; name: string } | null;
      const dueDate = task.dueDate as Date;
      return {
        id: task._id.toString(), title: task.title, projectId: project?._id.toString() ?? "",
        projectName: project?.name ?? "Unknown project", dueDate, status: task.status,
        priority: task.priority, isOverdue: task.status !== "completed" && dueDate < now,
      };
    }),
    projectHealth: projects.map((project) => {
      const counts = countsByProject.get(project._id.toString()) ?? { total: 0, completed: 0, overdue: 0 };
      return {
        id: project._id.toString(), name: project.name, status: project.status,
        deadline: project.deadline, totalTasks: counts.total, completedTasks: counts.completed,
        overdueTasks: counts.overdue,
        progress: counts.total ? Math.round((counts.completed / counts.total) * 100) : 0,
      };
    }),
  };
}
