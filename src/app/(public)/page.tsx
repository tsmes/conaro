import { auth } from "@/lib/auth";
import { HomepageView } from "@/components/homepage/homepage-view";

// Server component — reads the session to decide which CTA destinations to
// offer. All rendering lives in HomepageView so the page stays thin.
export default async function HomePage() {
  const session = await auth();
  return <HomepageView role={session?.user?.role} />;
}
