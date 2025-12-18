import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AngelOS MVP",
  description: "Modern angel investing platform MVP (Dealflow → IC → Publish) built on Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
