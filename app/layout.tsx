import "github-markdown-css/github-markdown-dark.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Docs",
  description: "GitHub Docs inspired template",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
