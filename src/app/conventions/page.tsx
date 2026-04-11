import { and, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { storage } from "@/lib/storage";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ConventionsDirectoryPage() {
  const conventionList = await db
    .select()
    .from(conventions)
    .where(and(isNotNull(conventions.description)));

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold">Conventions</h1>
      <p className="mt-2 text-muted-foreground">
        Discover conventions and their upcoming events.
      </p>

      {conventionList.length === 0 ? (
        <div className="mt-8 text-center text-muted-foreground">
          No conventions yet.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conventionList.map((convention) => {
            const logoUrl = convention.logoPath
              ? storage.getUrl(convention.logoPath)
              : null;

            return (
              <Card key={convention.id}>
                {logoUrl && (
                  <div className="flex items-center justify-center p-4 pb-0">
                    <img
                      src={logoUrl}
                      alt={`${convention.name} logo`}
                      className="h-20 w-auto rounded object-contain"
                    />
                  </div>
                )}
                <CardHeader className={logoUrl ? "pt-3" : undefined}>
                  <CardTitle className="text-lg">{convention.name}</CardTitle>
                  {convention.description && (
                    <CardDescription className="line-clamp-3">
                      {convention.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {convention.websiteUrl && (
                  <CardContent className="pt-0">
                    <a
                      href={convention.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline underline-offset-4"
                    >
                      Website
                    </a>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
