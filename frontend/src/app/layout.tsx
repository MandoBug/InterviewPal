import type { Metadata } from "next";
import "@/styles/globals.css"; 
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "InterviewPal - AI Mock Interview Prep",
  description:
    "Practice interviews with AI-generated questions, record your responses, and get actionable feedback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased flex">
        {/* 1. Add the Sidebar component here */}
        <Sidebar />
        
        {/* 2. Wrap children in a main tag with a left margin (ml-20) 
            so the content doesn't hide behind the sidebar */}
        <main className="flex-1 ml-20">
          {children}
        </main>
      </body>
    </html>
  );
}