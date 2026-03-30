import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Queen of Mahshi — ملكة المحشي",
  description: "Shop Management System for Queen of Mahshi Restaurant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
