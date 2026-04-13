import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AvatarMenu } from "@/components/layout/avatar-menu";
import { AuthSidebarNav } from "@/components/layout/auth-sidebar-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";

// Chrome for all authenticated surfaces. Composes shadcn's Sidebar primitive
// so collapse behavior, mobile sheet, keyboard shortcuts, and persistent
// state come for free. Each page keeps its own per-page auth() check — the
// shell only enforces "must be logged in" as a redirect guard, not
// role-based authorization.
export async function AuthShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.role) {
    redirect("/login");
  }

  const role = session.user.role;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <AuthSidebarNav role={role} />
      </Sidebar>
      <SidebarInset>
        <header className="glass-nav sticky top-0 z-40 flex h-16 items-center gap-3 border-b-0 px-4 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
          <NotificationBell />
          <ThemeToggle />
          <AvatarMenu
            name={session.user.name}
            email={session.user.email}
            role={role}
          />
        </header>
        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
