import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { ConventionProfileForm } from "@/components/conventions/convention-profile-form";
import { ConventionLogoUpload } from "@/components/conventions/convention-logo-upload";
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
            <Link
              href="/conventions/manage"
              className="inline-flex items-center gap-1"
            >
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
    </div>
  );
}
