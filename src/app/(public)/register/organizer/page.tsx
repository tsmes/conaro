import Link from "next/link";
import { OrganizerRegisterForm } from "@/components/auth/organizer-register-form";

export default function OrganizerRegisterPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl bg-card p-10 shadow-gallery">
        <div className="mb-8">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            For organizers
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
            Launch your organization
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your convention, run events, and review artists in one
            place.
          </p>
        </div>
        <OrganizerRegisterForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
