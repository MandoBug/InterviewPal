import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900">
          Interview<span className="text-primary-500">Pal</span>
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          AI-powered mock interview prep. Practice with realistic questions,
          record your responses, and get actionable feedback.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth"
            className="rounded-lg bg-primary-500 px-6 py-3 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/auth"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
