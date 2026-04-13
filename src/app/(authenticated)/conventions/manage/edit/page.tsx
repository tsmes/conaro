import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { storage } from "@/lib/storage";
import { ConventionProfileForm } from "@/components/conventions/convention-profile-form";
import { ConventionLogoUpload } from "@/components/conventions/convention-logo-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/conventions/manage">
          <Button variant="ghost" size="sm">
            &larr; Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Convention</h1>
      </div>

      <Separator className="my-6" />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Convention Info</CardTitle>
            <CardDescription>
              Name, description, and website for your convention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConventionProfileForm
              defaultValues={{
                name: convention.name,
                description: convention.description ?? "",
                websiteUrl: convention.websiteUrl ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Upload a logo or banner image for your convention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConventionLogoUpload
              currentLogoUrl={logoUrl}
              conventionName={convention.name}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
