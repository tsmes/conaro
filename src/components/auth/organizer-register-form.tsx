"use client";

import { useActionState } from "react";
import { registerOrganizer } from "@/app/register/organizer/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizerRegisterForm() {
  const [state, formAction, pending] = useActionState(registerOrganizer, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="displayName">Your name</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="Your name"
          required
        />
        {state.fieldErrors?.displayName && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.displayName[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="conventionName">Convention name</Label>
        <Input
          id="conventionName"
          name="conventionName"
          placeholder="e.g., Kawaiicon"
          required
        />
        {state.fieldErrors?.conventionName && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.conventionName[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
        {state.fieldErrors?.email && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
        />
        {state.fieldErrors?.password && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          required
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-sm text-destructive">
            {state.fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create organizer account"}
      </Button>
    </form>
  );
}
