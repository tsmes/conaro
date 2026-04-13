"use client";

import { useActionState } from "react";
import { registerArtist } from "@/app/(public)/register/artist/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ArtistRegisterForm() {
  const [state, formAction, pending] = useActionState(registerArtist, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          placeholder="Your artist name"
          required
          aria-describedby={
            state.fieldErrors?.displayName ? "displayName-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.displayName}
        />
        {state.fieldErrors?.displayName && (
          <p id="displayName-error" role="alert" className="text-sm text-destructive">
            {state.fieldErrors.displayName[0]}
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
          aria-describedby={
            state.fieldErrors?.email ? "email-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <p id="email-error" role="alert" className="text-sm text-destructive">
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
          aria-describedby={
            state.fieldErrors?.password ? "password-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.password}
        />
        {state.fieldErrors?.password && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
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
          aria-describedby={
            state.fieldErrors?.confirmPassword
              ? "confirmPassword-error"
              : undefined
          }
          aria-invalid={!!state.fieldErrors?.confirmPassword}
        />
        {state.fieldErrors?.confirmPassword && (
          <p
            id="confirmPassword-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.confirmPassword[0]}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create artist account"}
      </Button>
    </form>
  );
}
