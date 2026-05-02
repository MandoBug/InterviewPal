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
    if (savedRole) {
      setRole(savedRole);
    }
  }, [router]);

  function startInterview() {
    localStorage.setItem('selected_role', role);
    router.push('/interview');
  }

  const history = [
    { date: 'Apr 26', type: 'Behavioral', status: 'Complete' },
    { date: 'Apr 22', type: 'Technical', status: 'Complete' },
    { date: 'Apr 18', type: 'Situational', status: 'Complete' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-10 bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-blue-950">
              🐌
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">InterviewPal</h1>
              <p className="text-sm text-slate-400">Sprint 2 interview orchestration</p>
            </div>
          </div>
          <p className="text-sm text-slate-400">Welcome back!</p>
        </header>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-300">
            Start a new practice session
          </p>
          <h2 className="mb-4 text-3xl font-extrabold text-white">Choose your interview role</h2>
          <p className="mb-6 max-w-2xl text-slate-400">
            This role is saved and sent to the AI question generator, so each interview session gets tailored questions.
          </p>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <button
              onClick={startInterview}
              className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
            >
              Start Interview →
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Session History</h3>
            <ul className="space-y-4">
              {history.map((session, i) => (
                <li key={i} className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0">
                  <span className="font-medium text-slate-200">{session.date} - {session.type}</span>
                  <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                    {session.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-400">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Sprint 2 Status</h3>
            <ul className="space-y-2 text-sm">
              <li>✅ Start interview route connected</li>
              <li>✅ Role is passed into question generation</li>
              <li>✅ Loading state appears during generation</li>
              <li>✅ Questions are shown one at a time</li>
            </ul>
          </div>
        </div>

        <footer className="mt-16 text-center text-xs text-slate-500">
          Powered by FastAPI, PostgreSQL, and Claude-compatible AI fallback logic
        </footer>
      </div>
    </div>
  );
}
