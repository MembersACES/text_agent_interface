import "@/css/satoshi.css";
import "@/css/style.css";

import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import FloatingAgentChat from "@/components/FloatingAgentChat";
import { CommandPalette } from "@/components/CommandPalette";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND.name}`,
    default: BRAND.name,
  },
  description: `${BRAND.name} admin dashboard for utility invoice management, client CRM, document generation, and sustainability workflows.`,
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader color="#5750F1" showSpinner={false} />

          <div className="flex min-h-screen">
            <Sidebar />

            <div className="w-full bg-canvas dark:bg-canvas-dark">
              <Header />

              <main className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-8">
                {children}
              </main>
            </div>
          </div>

          {/* 👇 Floating Agent always available on all pages */}
          <FloatingAgentChat />
          <CommandPalette />
        </Providers>
      </body>
    </html>
  );
}
