import { redirect } from "next/navigation";
import { eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { computeCompleteness } from "@/lib/profile/completeness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletenessIndicator } from "@/components/profile/completeness-indicator";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    redirect("/login");
  }

  const profileId = session.user.profileId;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId));

  const [artistProfile] = await db
    .select()
    .from(artistProfiles)
    .where(eq(artistProfiles.profileId, profileId));

  const [{ value: imageCount }] = await db
    .select({ value: count() })
    .from(portfolioImages)
    .where(eq(portfolioImages.profileId, profileId));

  const completeness = computeCompleteness(profile, artistProfile, imageCount);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome back. Your applications will appear here.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletenessIndicator completeness={completeness} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
