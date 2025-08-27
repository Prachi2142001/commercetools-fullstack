import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Storefront",
  description: "Commercetools PLP & PDP demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
