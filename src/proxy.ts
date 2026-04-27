import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const artistRoutes = ["/dashboard"];
// Only the organizer admin surfaces require auth — /conventions
// (directory) and /conventions/<id> (detail) live in the (public)
// route group and must stay accessible without a session. Including
// the bare "/conventions" prefix here previously redirected every
// public visitor to /login.
const organizerRoutes = ["/conventions/manage"];
const authRoutes = ["/login", "/register"];

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isArtistRoute = artistRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isOrganizerRoute = organizerRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Redirect logged-in users away from auth pages
  if (isAuthRoute && session?.user) {
    const redirectTo =
      session.user.role === "organizer" ? "/conventions" : "/dashboard";
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl));
  }

  // Redirect unauthenticated users to login
  if ((isArtistRoute || isOrganizerRoute) && !session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Redirect wrong role to their own dashboard
  if (isArtistRoute && session?.user?.role === "organizer") {
    return NextResponse.redirect(new URL("/conventions", req.nextUrl));
  }

  if (isOrganizerRoute && session?.user?.role === "artist") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
