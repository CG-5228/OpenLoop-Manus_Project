import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenLoop | Remember the promises in your conversations",
  description:
    "OpenLoop uses AI to turn conversations into evidence-backed commitments you can track and act on.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
