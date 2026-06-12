import { Providers } from "@/app/providers";
import { AppNav } from "@/components/layout/AppNav";
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
      suppressHydrationWarning
    >
      <head>
        <script
          // Apply the stored theme before paint to avoid a light/dark flash.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('fire-theme')==='dark'?'dark':'light';var r=document.documentElement;r.classList.add(t);r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="flex min-h-dvh flex-col bg-canvas font-sans text-ink">
        <Providers>
          <main className="mx-auto flex w-full max-w-lg flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:max-w-none lg:pb-0 lg:pl-60">
            {children}
          </main>
          <AppNav />
        </Providers>
      </body>
    </html>
  );
}
