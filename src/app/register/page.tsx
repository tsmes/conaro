import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-2xl font-bold">Create your account</h1>
      <p className="mb-8 text-muted-foreground">
        Choose how you want to use Art Apply
      </p>
      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="mb-2 text-4xl">🎨</div>
            <CardTitle>I&apos;m an Artist</CardTitle>
            <CardDescription>
              Create your profile and portfolio, then apply to conventions with a
              single click.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/register/artist"
              className={cn(buttonVariants(), "w-full")}
            >
              Sign up as Artist
            </Link>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="flex-1">
            <div className="mb-2 text-4xl">🎪</div>
            <CardTitle>I organize a Convention</CardTitle>
            <CardDescription>
              Set up your convention, manage events, and review artist
              applications in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/register/organizer"
              className={cn(buttonVariants(), "w-full")}
            >
              Sign up as Organizer
            </Link>
          </CardContent>
        </Card>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
