"use client";

import { useTransition } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollow } from "@/app/(public)/conventions/[conventionId]/actions";

export interface FollowButtonProps {
  conventionId: string;
  isFollowing: boolean;
}

// Thin client wrapper around the existing toggleFollow server action so the
// landing page can flip a convention's follow state inline on each card.
// The server action handles auth + revalidatePath("/").
export function FollowButton({ conventionId, isFollowing }: FollowButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const form = new FormData();
    form.set("conventionId", conventionId);
    startTransition(async () => {
      await toggleFollow({}, form);
    });
  };

  return (
    <Button
      type="button"
      variant={isFollowing ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFollowing}
    >
      <Heart
        className="size-3.5"
        fill={isFollowing ? "currentColor" : "none"}
      />
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
