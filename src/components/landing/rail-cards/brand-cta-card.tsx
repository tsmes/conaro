import Link from "next/link";
import { Palette, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface BrandCtaCardProps {
  viewer: "public" | "organizer";
}

export function BrandCtaCard({ viewer }: BrandCtaCardProps) {
  return (
    <Card className="overflow-hidden p-0 shadow-gallery">
      <div className="cover-a relative p-5 text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/40"
        />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-85">
            Conaro
          </p>
          <p className="mt-1 font-heading text-lg font-extrabold leading-tight tracking-tight">
            Every convention, one place.
          </p>
          <p className="mt-2 text-[12.5px] opacity-90">
            {viewer === "organizer"
              ? "Manage your conventions and events in one workspace."
              : "Browse freely \u2014 no account needed. Are you an artist or running a con?"}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {viewer === "organizer" ? (
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href="/conventions/manage">
                <Users className="size-3.5" /> Manage conventions
              </Link>
            }
          />
        ) : (
          <>
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href="/register/artist">
                  <Palette className="size-3.5" /> I&apos;m an artist
                </Link>
              }
            />
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/register/organizer">
                  <Users className="size-3.5" /> I&apos;m an organizer
                </Link>
              }
            />
          </>
        )}
      </div>
    </Card>
  );
}
