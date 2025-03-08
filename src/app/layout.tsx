import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GitHub Unfollowers Finder",
  description: "Find GitHub users you follow who don’t follow you back",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="Vcev7wasBlc4CWcZOjEJETOtVyAShbLPbbYsNU02_2o"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
