import { Providers } from "@/app/providers";
import { AppNav } from "@/components/layout/AppNav";
import type { Metadata } from "next";
import "./globals.css";

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
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Ember type system: Newsreader (display/reflection) + Hanken Grotesk (data/UI) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
