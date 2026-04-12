import Link from "next/link";
import { isNotNull } from "drizzle-orm";
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
  // Show conventions that have a description (indicates a completed profile)
  const conventionList = await db
    .select()
    .from(conventions)
    .where(isNotNull(conventions.description))
    .orderBy(conventions.name);

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
              <Link
                key={convention.id}
                href={`/conventions/${convention.id}`}
                className="block"
              >
              <Card className="h-full transition-colors hover:bg-muted/50">
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
              </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
