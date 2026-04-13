import { AuthShell } from "@/components/layout/auth-shell";

// Layout for the (authenticated) route group — wraps every logged-in page
// in the sidebar-based AuthShell. The shell redirects to /login for any
// request without a session. Per-page role-based redirects (artist vs
// organizer) stay in each page file so role authorization is unchanged.
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
