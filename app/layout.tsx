import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Toaster } from "sonner";
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
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <header style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "12px 24px",
            gap: "12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <SignedOut>
              <SignInButton>
                <button className="btn-ghost">Sign In</button>
              </SignInButton>
              <SignUpButton>
                <button className="btn-primary">Sign Up</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: { avatarBox: { width: "36px", height: "36px" } },
                }}
              />
            </SignedIn>
          </header>
          {children}
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
