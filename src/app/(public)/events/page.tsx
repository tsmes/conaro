import { redirect } from "next/navigation";

// The standalone events directory was a strict subset of the landing
// page (`/`), which already lists upcoming events with richer
// filters and per-card auth context. Keep this route as a permanent
// redirect so any external bookmark or in-flight notification link
// still lands somewhere sensible.
export default function EventsRedirect() {
  redirect("/");
}
