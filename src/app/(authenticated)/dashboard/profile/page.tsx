import { redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { storage } from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { BasicInfoForm } from "@/components/profile/basic-info-form";
import { LogisticsForm } from "@/components/profile/logistics-form";
import { PortfolioGallery } from "@/components/profile/portfolio-gallery";
import { parseSocialLinks } from "@/lib/artist-profile/social-links";

function SectionShell({
  id,
  label,
  title,
  description,
  children,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          {label}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-8">{children}</div>
      </Card>
    </section>
  );
}

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

  const promoImages = imagesWithUrls.filter((i) => i.section === "promo");
  const productImages = imagesWithUrls.filter((i) => i.section === "product");
  const previousStandImages = imagesWithUrls.filter(
    (i) => i.section === "previous_stand"
  );
  const totalUsed = imagesWithUrls.length;

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-6 py-10 md:px-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Curation workspace
        </p>
        <h1 className="mt-3 font-heading text-display-md font-extrabold tracking-tight">
          My Artist Profile
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Keep your profile fresh — every section feeds directly into the
          applications you send to organizers.
        </p>
      </header>

      <SectionShell
        id="basic-info"
        label="Section 1"
        title="Basic Info"
        description="Your public identity and how organizers reach you."
      >
        <BasicInfoForm
          defaultValues={{
            displayName: profile?.displayName ?? "",
            realName: artistProfile?.realName ?? "",
            contactEmail: artistProfile?.contactEmail ?? "",
            phone: artistProfile?.phone ?? "",
            bio: artistProfile?.bio ?? "",
            websiteUrl: artistProfile?.websiteUrl ?? "",
            socialLinks: parseSocialLinks(artistProfile?.socialLinks),
            genres: artistProfile?.genres ?? [],
            mediums: artistProfile?.mediums ?? [],
            pronouns: artistProfile?.pronouns ?? "",
            priceRangeMinNok: artistProfile?.priceRangeMinNok ?? null,
            priceRangeMaxNok: artistProfile?.priceRangeMaxNok ?? null,
          }}
        />
      </SectionShell>

      <SectionShell
        id="logistics"
        label="Section 2"
        title="Logistics"
        description="Helpers and accessibility needs you carry across every event."
      >
        <LogisticsForm
          defaultValues={{
            helpers: artistProfile?.helpers ?? 0,
            accessibilityNeeds: artistProfile?.accessibilityNeeds ?? "",
            notes: artistProfile?.notes ?? "",
          }}
        />
      </SectionShell>

      <SectionShell
        id="promo"
        label="Section 3"
        title="Promo"
        description="Logos, banners, and key visuals organizers can use to promote your stand."
      >
        <PortfolioGallery
          section="promo"
          images={promoImages}
          totalCap={20}
          totalUsed={totalUsed}
          allowCaption
        />
      </SectionShell>

      <SectionShell
        id="products"
        label="Section 4"
        title="Products"
        description="Examples of what you'll be selling. Up to 20 images across all sections."
      >
        <PortfolioGallery
          section="product"
          images={productImages}
          totalCap={20}
          totalUsed={totalUsed}
          allowCaption
        />
      </SectionShell>

      <SectionShell
        id="previous-stands"
        label="Section 5"
        title="Previous Stands"
        description="Photos from past conventions. Add an optional caption per image (e.g. convention + year)."
      >
        <PortfolioGallery
          section="previous_stand"
          images={previousStandImages}
          totalCap={20}
          totalUsed={totalUsed}
          allowCaption
        />
      </SectionShell>
    </div>
  );
}
