import type { ReactNode } from "react";
import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "InterviewPal - AI Mock Interview Prep",
  description:
    "Practice interviews with AI-generated questions, record your responses, and get actionable feedback.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.dataset.theme = theme;
              } catch {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))] antialiased">
        {children}
      </body>
    </html>
  );
}
