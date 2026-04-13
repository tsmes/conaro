import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Art Apply",
  description:
    "A platform for artists to apply for convention stands. Maintain your profile once, apply everywhere.",
};

// Root layout stays minimal: fonts, providers (theme + session + tooltip),
// and the global style sheet. Page chrome (headers, sidebars, footers)
// lives in the route-group layouts — (public)/layout.tsx for the glass
// PublicShell and (authenticated)/layout.tsx for the AuthShell.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
