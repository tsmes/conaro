import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl bg-card p-10 shadow-gallery">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your applications or events.
          </p>
        </div>
        <LoginForm />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        New to Conaro?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
