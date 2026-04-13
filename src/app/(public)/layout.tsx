import { PublicShell } from "@/components/layout/public-shell";

// Layout for the (public) route group — wraps every public-facing page in
// the glass-nav PublicShell. Auth is intentionally NOT enforced here; pages
// that need a session keep their own per-page checks.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
