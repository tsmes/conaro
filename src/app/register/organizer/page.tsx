import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizerRegisterForm } from "@/components/auth/organizer-register-form";

export default function OrganizerRegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create organizer account</CardTitle>
          <CardDescription>
            Set up your convention and start managing applications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizerRegisterForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
