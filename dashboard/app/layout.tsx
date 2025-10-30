import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "LLM Daily - Dashboard",
  description: "Automated LLM task scheduling with GitHub Actions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-cream dark:bg-gray-900 antialiased">
        <Navigation />
        <main className="flex-grow max-w-screen-xl mx-auto px-6 py-6 pb-12 w-full">
          {children}
        </main>
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="max-w-screen-xl mx-auto px-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>LLM Daily - Automated task scheduling with GitHub Actions</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
