"use client";

import { useActionState } from "react";
import {
  followConvention,
  unfollowConvention,
} from "@/app/conventions/[conventionId]/actions";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/validations/auth";

interface FollowButtonProps {
  conventionId: string;
  isFollowing: boolean;
}

export function FollowButton({
  conventionId,
  isFollowing,
}: FollowButtonProps) {
  const action = isFollowing ? unfollowConvention : followConvention;
  const [state, formAction, pending] = useActionState(action, {});

  // After successful toggle, show opposite state
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
