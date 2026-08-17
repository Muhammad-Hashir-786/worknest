import Link from "next/link";
import { requireOrgContext } from "~/lib/auth/current-org";
import { getUserOrganizations } from "~/services/organization";
import { logout } from "~/actions/auth";
import OrgSwitcher from "~/components/organization/org-switcher";
import { getUnreadNotificationCount } from "~/services/notification";
import SidebarNav from "~/components/dashboard/sidebar-nav";

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
    { label: "Overview", href: "/dashboard", icon: "◈" }, { label: "Projects", href: "/dashboard/projects", icon: "□" },
    { label: "Clients", href: "/dashboard/clients", icon: "○" }, { label: "Reports", href: "/dashboard/reports", icon: "▤" }, { label: "Team", href: "/dashboard/settings/team", icon: "♧" },
    { label: "Settings", href: "/dashboard/settings/organization", icon: "⚙" },
    { label: "Notifications", href: "/dashboard/notifications", icon: "●", badge: unreadNotifications || undefined },
    ...(role === "owner" ? [{ label: "Billing", href: "/dashboard/settings/billing", icon: "◇" }] : []),
  ];
  return <div className="min-h-screen bg-[#f7f7f6] lg:flex">
    <aside className="bg-[#171717] px-5 py-5 text-white lg:fixed lg:inset-y-0 lg:w-64 lg:px-4 lg:py-7">
      <div className="flex items-center justify-between lg:block"><Link href="/dashboard" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#d92d27] text-sm">W</span>WorkNest</Link><span className="text-xs text-neutral-400 lg:hidden">{organization.name}</span></div>
      <div className="mt-7 hidden lg:block"><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Workspace</p><OrgSwitcher current={{ id: organization.id, name: organization.name }} organizations={organizations.map((membership) => ({ id: membership.organization.id, name: membership.organization.name, role: membership.role }))}/></div>
      <SidebarNav items={navItems} />
      <div className="mt-6 hidden border-t border-neutral-800 pt-5 lg:block"><p className="text-sm font-medium text-white">{user.name}</p><p className="mt-0.5 text-xs capitalize text-neutral-500">{role}</p><form action={logout} className="mt-4"><button type="submit" className="text-sm text-neutral-400 hover:text-white">Log out</button></form></div>
    </aside>
    <div className="min-w-0 flex-1 lg:ml-64"><main className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-10">{children}</main></div>
  </div>;
}
