import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "My Dev Blog",
  description: "開発メモと学習記録",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto max-w-3xl px-6 py-10">
          <header className="mb-10">
            <h1 className="text-3xl font-bold">
              <Link href="/">My Dev Blog</Link>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Next.js + GitHub Pages で作る開発ブログ
            </p>
          </header>

          <main>{children}</main>

          <footer className="mt-16 border-t pt-6 text-sm text-gray-500">
            © 2026 My Dev Blog
          </footer>
        </div>
      </body>
    </html>
  );
}