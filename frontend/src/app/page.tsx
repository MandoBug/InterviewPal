import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-2xl text-center">
        {/* Added the Slug Emoji for that UCSC touch! */}
        <div className="mb-6 text-6xl">🐌</div>
        
        <h1 className="mb-4 text-6xl font-extrabold tracking-tight text-slate-900">
          Interview<span className="text-blue-600">Pal</span>
        </h1>
        
        <p className="mb-10 text-xl text-slate-600 leading-relaxed">
          AI-powered mock interview prep for UCSC students. 
          Practice with realistic questions, record your responses, 
          and get actionable feedback from Claude AI.
        </p>

        <div className="flex gap-4 justify-center">
          {/* Changed this to /dashboard so you can see your work immediately */}
          <Link
            href="/dashboard"
            className="rounded-xl bg-blue-600 px-8 py-4 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
          >
            Get Started
          </Link>
          
          <Link
            href="/auth"
            className="rounded-xl border-2 border-slate-200 px-8 py-4 text-slate-700 font-bold text-lg hover:bg-slate-50 transition-all active:scale-95"
          >
            Sign In
          </Link>
        </div>
        
        <p className="mt-12 text-sm text-slate-400 font-medium">
          Ready to prep for that interview? 🚀
        </p>
      </div>
    </main>
  );
}