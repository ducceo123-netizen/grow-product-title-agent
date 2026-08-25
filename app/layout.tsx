import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GROW — Product Title Agent",
  description: "Generate, review, and improve product titles with team feedback.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
