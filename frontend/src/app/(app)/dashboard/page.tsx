'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const roleOptions = [
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'UX Designer',
  'Human Resources Specialist',
];

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState('Software Engineer');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/auth');
      return;
    }

    const savedRole = localStorage.getItem('selected_role');
    if (savedRole) setRole(savedRole);
  }, [router]);

  function startInterview() {
    localStorage.setItem('selected_role', role);
    router.push('/interview');
  }

  const history = [
    {
      type: 'Video Interview',
      role: 'Software Engineer',
      created_at: '2026-05-20T23:41:00',
      status: 'Complete',
      duration: '8:34',
    },
    {
      type: 'Video Interview',
      role: 'Software Engineer',
      created_at: '2026-05-21T23:41:00',
      status: 'Complete',
      duration: '10:02',
    },
    {
      type: 'Video Interview',
      role: 'Software Engineer',
      created_at: '2026-05-22T23:41:00',
      status: 'Complete',
      duration: '5:19',
    }
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))] transition-colors">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-5 shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 font-bold text-blue-950">
              🐌
            </div>
            <div>
              <h1 className="text-xl font-bold text-[rgb(var(--foreground-rgb))]">
                InterviewPal
              </h1>
              <p className="text-sm text-[rgb(var(--muted-rgb))]">
                Sprint 2 interview orchestration
              </p>
            </div>
          </div>
          <p className="text-sm text-[rgb(var(--muted-rgb))]">Welcome back!</p>
        </header>

        <section className="mb-8 rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-8 shadow-xl transition-colors">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
            Start a new practice session
          </p>

          <h2 className="mb-4 text-3xl font-extrabold text-[rgb(var(--foreground-rgb))]">
            Choose your interview role
          </h2>

          <p className="mb-6 max-w-2xl text-[rgb(var(--muted-rgb))]">
            This role is saved and sent to the AI question generator, so each interview session gets tailored questions.
          </p>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="relative w-full">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-4 py-4 pr-12 text-[rgb(var(--foreground-rgb))] outline-none transition-colors focus:ring-2 focus:ring-blue-500"
              >
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-rgb))]">
                ▼
              </div>
            </div>

            <button
              onClick={startInterview}
              className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
            >
              Start Interview →
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-sm transition-colors">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
              Session History (Placeholder values, need to change)
            </h3>

            <ul className="space-y-4">
              {history.map((session, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-[rgb(var(--border-rgb))] pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-[rgb(var(--foreground-rgb))]">
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {session.role} {session.type}
                    </p>
                    <p className="mt-1 text-xs text-[rgb(var(--muted-rgb))]">
                      Duration: {session.duration}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">
                    {session.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 transition-colors">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
              Sprint 2 Status
            </h3>

            <ul className="space-y-2 text-sm text-[rgb(var(--muted-rgb))]">
              <li>✅ Start interview route connected</li>
              <li>✅ Role is passed into question generation</li>
              <li>✅ Loading state appears during generation</li>
              <li>✅ Questions are shown one at a time</li>
            </ul>
          </div>
        </div>

        <footer className="mt-16 text-center text-xs text-[rgb(var(--muted-rgb))]">
          Powered by FastAPI, PostgreSQL, and Claude-compatible AI fallback logic
        </footer>
      </div>
    </div>
  );
}