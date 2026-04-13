"use client";

import { useActionState } from "react";
import { login } from "@/app/(public)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email" className={LABEL_CLASS}>
          Email address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="curator@conaro.app"
          required
          aria-invalid={!!state.error}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className={LABEL_CLASS}>
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          aria-invalid={!!state.error}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}
