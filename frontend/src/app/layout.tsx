import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "InterviewPal - AI Mock Interview Prep",
  description:
    "Practice interviews with AI-generated questions, record your responses, and get actionable feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}