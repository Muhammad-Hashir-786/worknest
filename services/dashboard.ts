import "server-only";
import connectDB from "~/lib/db";
import Project from "~/models/projects";
import Task from "~/models/tasks";
import UserOrganization from "~/models/user_organization";

export interface DashboardData {
  totalProjects: number; activeProjects: number; totalTasks: number; completedTasks: number;
  overdueTasks: number; memberCount: number; taskDistribution: { status: string; count: number }[];
}

export async function getDashboardData(organizationId: string): Promise<DashboardData> {
  await connectDB();
  const now = new Date();
  const [totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, memberCount, distribution] = await Promise.all([
    Project.countDocuments({ organization: organizationId }),
    Project.countDocuments({ organization: organizationId, status: "active" }),
    Task.countDocuments({ organization: organizationId }),
    Task.countDocuments({ organization: organizationId, status: "completed" }),
    Task.countDocuments({ organization: organizationId, status: { $ne: "completed" }, dueDate: { $lt: now } }),
    UserOrganization.countDocuments({ organization: organizationId }),
    Task.aggregate<{ _id: string; count: number }>([
      { $match: { organization: organizationId } }, { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  return { totalProjects, activeProjects, totalTasks, completedTasks, overdueTasks, memberCount,
    taskDistribution: distribution.map((row) => ({ status: row._id, count: row.count })) };
}
