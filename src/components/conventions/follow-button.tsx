"use client";

import { useActionState } from "react";
import { toggleFollow } from "@/app/(public)/conventions/[conventionId]/actions";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  conventionId: string;
  isFollowing: boolean;
}

export function FollowButton({
  conventionId,
  isFollowing,
}: FollowButtonProps) {
  const [state, formAction, pending] = useActionState(toggleFollow, {});

  // Each successful toggle flips the state
  const currentlyFollowing = state.success ? !isFollowing : isFollowing;

  return (
    <form action={formAction}>
      <input type="hidden" name="conventionId" value={conventionId} />
      <Button
        type="submit"
        variant={currentlyFollowing ? "outline" : "default"}
        size="sm"
        disabled={pending}
      >
        {pending
          ? "..."
          : currentlyFollowing
            ? "Following"
            : "Follow"}
      </Button>
      {state.error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
