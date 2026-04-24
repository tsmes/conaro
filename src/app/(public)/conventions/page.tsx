import Link from "next/link";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { storage } from "@/lib/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { markdownToText } from "@/lib/utils/markdown-to-text";

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function ConventionsDirectoryPage() {
  const conventionList = await db
    .select()
    .from(conventions)
    .orderBy(conventions.name);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
      <header className="mb-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Convention directory
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
          Discover conventions
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Browse conventions and the upcoming events they&apos;re running.
        </p>
      </header>

      {conventionList.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No conventions listed yet.
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                <Card interactive className="h-full p-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="size-14 rounded-2xl">
                      {logoUrl && (
                        <AvatarImage
                          src={logoUrl}
                          alt={`${convention.name} logo`}
                        />
                      )}
                      <AvatarFallback className="rounded-2xl bg-secondary text-sm font-semibold">
                        {conventionInitials(convention.name)}
                      </AvatarFallback>
                    </Avatar>
                    <h2 className="min-w-0 font-heading text-lg font-bold tracking-tight">
                      {convention.name}
                    </h2>
                  </div>
                  {convention.description && (
                    <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {markdownToText(convention.description)}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
