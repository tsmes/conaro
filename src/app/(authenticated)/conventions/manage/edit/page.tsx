import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { ConventionProfileForm } from "@/components/conventions/convention-profile-form";
import { ConventionLogoUpload } from "@/components/conventions/convention-logo-upload";
import { BannerUpload } from "@/components/conventions/banner-upload";
import { HeaderColorPicker } from "@/components/conventions/header-color-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function EditConventionPage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    redirect("/login");
  }

  const logoUrl = convention.logoPath
    ? storage.getUrl(convention.logoPath)
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/conventions/manage">
              <ArrowLeft className="size-4" />
              Back to workspace
            </Link>
          }
        />
      </div>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Convention settings
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Edit Convention
        </h1>
      </header>

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Section 1
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Convention Info
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Name, description, and website artists see in the directory.
        </p>
        <div className="mt-8">
          <ConventionProfileForm
            defaultValues={{
              name: convention.name,
              description: convention.description ?? "",
              websiteUrl: convention.websiteUrl ?? "",
              guidelines: convention.guidelines ?? "",
              acceptanceMessage: convention.acceptanceMessage ?? "",
              rejectionMessage: convention.rejectionMessage ?? "",
              waitlistEnabled: convention.waitlistEnabled,
            }}
          />
        </div>
      </Card>

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Section 2
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Logo
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a square logo — shown on every event card and your public
          convention page.
        </p>
        <div className="mt-8">
          <ConventionLogoUpload
            currentLogoUrl={logoUrl}
            conventionName={convention.name}
          />
        </div>
      </Card>

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Section 3
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold tracking-tight">
          Branding
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Defaults inherited by every event. Each event can override either
          the colour or banners individually.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Header colour
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Replaces the auto-picked gradient on the event hero. The dark
              overlay on top keeps text legible.
            </p>
            <div className="mt-3">
              <HeaderColorPicker
                endpoint="/api/conventions/header-color"
                initialColor={convention.headerColor}
                label="Convention header colour"
              />
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Desktop banner
              </p>
              <div className="mt-3">
                <BannerUpload
                  endpoint="/api/conventions/banner"
                  currentBannerUrl={
                    convention.bannerPath
                      ? storage.getUrl(convention.bannerPath)
                      : null
                  }
                  altLabel={`${convention.name} banner`}
                  previewAspectClass="aspect-[4/1]"
                  hint="Wide hero — JPEG, PNG, WebP, or AVIF. Max 8 MB. 4:1 works best."
                  placeholderHint="No convention banner — events fall back to the gradient."
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Mobile banner
              </p>
              <div className="mt-3">
                <BannerUpload
                  endpoint="/api/conventions/banner-mobile"
                  currentBannerUrl={
                    convention.bannerMobilePath
                      ? storage.getUrl(convention.bannerMobilePath)
                      : null
                  }
                  altLabel={`${convention.name} mobile banner`}
                  previewAspectClass="aspect-[3/4]"
                  hint="Optional — sits behind the hero text on phones. A tall portrait crop (3:4 or 4:5) works best. Falls back to the desktop banner if unset."
                  placeholderHint="No mobile banner — the desktop banner is shown on phones."
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
