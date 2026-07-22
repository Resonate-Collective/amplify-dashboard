import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Amplify effectiveness dashboard",
  description: "How the Amplify team is serving Resonate's churches.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
