import Link from "next/link";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getUserOrganizations } from "~/services/organization";
import { logout } from "~/actions/auth";
import OrgSwitcher from "~/components/organization/org-switcher";
import { getUnreadNotificationCount } from "~/services/notification";
import SidebarNav from "~/components/dashboard/sidebar-nav";
import WorkNestGuide from "~/components/ai/worknest-guide";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The authoritative check for everything under /dashboard: confirms both
  // that the session belongs to a real user AND that the active-organization
  // cookie points at an organization that user is actually a member of.
  // proxy.ts only handles the fast JWT-presence redirect; this - and the
  // membership lookup behind it - is what every page here really relies on.
  const { user, organization, role } = await requireOrgContext();
  const [organizations, unreadNotifications] = await Promise.all([getUserOrganizations(user.id), getUnreadNotificationCount(user.id, organization.id)]);

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: "◈", section: "Workspace" }, { label: "Projects", href: "/dashboard/projects", icon: "□", section: "Workspace" },
    { label: "Clients", href: "/dashboard/clients", icon: "○", section: "Workspace" }, { label: "Reports", href: "/dashboard/reports", icon: "▤", section: "Workspace" }, { label: "Team", href: "/dashboard/settings/team", icon: "♧", section: "Manage" },
    { label: "Settings", href: "/dashboard/settings/organization", icon: "⚙", section: "Manage" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "●", badge: unreadNotifications || undefined, section: "Manage" },
    ...(role === "owner" ? [{ label: "Billing", href: "/dashboard/settings/billing", icon: "◇", section: "Manage" }] : []),
  ];
  return <div className="min-h-screen bg-[#f7f7f6] lg:flex">
    <aside className="dashboard-sidebar bg-[#151515] px-5 py-5 text-white lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:px-5 lg:py-6">
      <div className="flex items-center justify-between lg:block"><Link href="/dashboard" className="group inline-flex items-center gap-3 text-xl font-bold tracking-tight"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#d92d27] text-base shadow-lg shadow-red-950/40 transition group-hover:rotate-[-6deg]">W</span><span>WorkNest<span className="text-[#ff756d]">.</span></span></Link><span className="text-xs text-neutral-400 lg:hidden">{organization.name}</span></div>
      <p className="mt-3 hidden text-xs leading-5 text-neutral-500 lg:block">A calmer, clearer way to move important work forward.</p>
      <div className="mt-7 hidden lg:block"><p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600">Workspace</p><OrgSwitcher current={{ id: organization.id, name: organization.name }} organizations={organizations.map((membership) => ({ id: membership.organization.id, name: membership.organization.name, role: membership.role }))}/></div>
      <SidebarNav items={navItems} />
      <div className="mt-auto hidden border-t border-white/10 pt-5 lg:block"><div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/15 text-xs font-bold text-red-200">{user.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-500">{role}</p></div><form action={logout}><button type="submit" aria-label="Log out" className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 transition hover:bg-white/10 hover:text-white">↗</button></form></div></div>
    </aside>
    <div className="min-w-0 flex-1 lg:ml-72"><main className="dashboard-main mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12 lg:py-10">{children}</main></div>
    <WorkNestGuide />
  </div>;
}
