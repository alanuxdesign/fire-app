import { TabBar } from "@/components/layout/TabBar";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fire",
  description: "Personal finance and portfolio tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col bg-stone-100 font-sans">
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <TabBar />
      </body>
    </html>
  );
}
