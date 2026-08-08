import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOLKS",
  description: "A tiny society evolving in your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
