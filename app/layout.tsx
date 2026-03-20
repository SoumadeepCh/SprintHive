import type { Metadata } from "next";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import { Toaster } from "sonner";
import Sidebar from "./components/Sidebar";
import LandingPage from "./components/LandingPage";
import "./globals.css";

export const metadata: Metadata = {
  title: "SprintHive — Team Task & Sprint Manager",
  description: "A beautiful, minimal sprint management app powered by Next.js, Prisma, and Clerk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          {/* Signed-out: show the landing page */}
          <SignedOut>
            <LandingPage />
          </SignedOut>

          {/* Signed-in: sidebar + content */}
          <SignedIn>
            <div className="app-shell">
              <Sidebar />
              <main className="app-main">
                {children}
              </main>
            </div>
          </SignedIn>

          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "rgba(20,20,35,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#e2e2e2",
                backdropFilter: "blur(12px)",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
