import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { storage } from "@/lib/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BasicInfoForm } from "@/components/profile/basic-info-form";
import { LogisticsForm } from "@/components/profile/logistics-form";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    redirect("/login");
  }

  const profileId = session.user.profileId;

  const [profileResult, artistProfileResult, images] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, profileId)),
    db.select().from(artistProfiles).where(eq(artistProfiles.profileId, profileId)),
    db
      .select()
      .from(portfolioImages)
      .where(eq(portfolioImages.profileId, profileId))
      .orderBy(asc(portfolioImages.sortOrder)),
  ]);

  const [profile] = profileResult;
  const [artistProfile] = artistProfileResult;

  const imagesWithUrls = images.map((img) => ({
    ...img,
    url: storage.getUrl(img.storagePath),
  }));

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Edit Profile</h1>
      <p className="mt-2 text-muted-foreground">
        Keep your profile up to date so conventions have the info they need.
      </p>

      <Separator className="my-6" />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
            <CardDescription>
              Your public identity and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BasicInfoForm
              defaultValues={{
                displayName: profile?.displayName ?? "",
                realName: artistProfile?.realName ?? "",
                contactEmail: artistProfile?.contactEmail ?? "",
                phone: artistProfile?.phone ?? "",
                bio: artistProfile?.bio ?? "",
                websiteUrl: artistProfile?.websiteUrl ?? "",
                socialLinks: artistProfile?.socialLinks ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logistics</CardTitle>
            <CardDescription>
              Table preferences and accessibility needs for conventions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogisticsForm
              defaultValues={{
                helpers: artistProfile?.helpers ?? 0,
                accessibilityNeeds: artistProfile?.accessibilityNeeds ?? "",
                tableSizePreference: artistProfile?.tableSizePreference ?? "",
                notes: artistProfile?.notes ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio</CardTitle>
            <CardDescription>
              Upload images of your work. Conventions will see these when you
              apply. Up to 20 images, max 10 MB each.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PortfolioGallery images={imagesWithUrls} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
