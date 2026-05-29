'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type InterviewMode = 'text' | 'video';

export default function InterviewSetupPage() {
  const router = useRouter();
  const [role, setRole] = useState('Software Engineer');
  const [level, setLevel] = useState<'Intern' | 'Junior' | 'Senior'>('Junior');
  const [mode, setMode] = useState<InterviewMode>('text');

  useEffect(() => {
    const savedRole = localStorage.getItem('selected_role');
    if (savedRole) setRole(savedRole);

    const savedLevel = localStorage.getItem('selected_level') as 'Intern' | 'Junior' | 'Senior' | null;
    if (savedLevel) setLevel(savedLevel);
  }, []);

  function startInterview() {
    localStorage.setItem('selected_role', role);
    localStorage.setItem('selected_level', level);
    localStorage.setItem('selected_interview_mode', mode);

    if (mode === 'video') {
      router.push('/interview/video');
    } else {
      router.push('/interview/text');
    }
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-10 shadow-xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-500">
          Interview Setup
        </p>

        <h1 className="mb-4 text-4xl font-extrabold">Start Interview</h1>

        <p className="mb-8 text-[rgb(var(--muted-rgb))]">
          Choose your role, level, and interview format before starting your session.
        </p>

        <label className="mb-2 block text-sm font-semibold">Role</label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mb-6 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-4 py-4 text-[rgb(var(--foreground-rgb))] outline-none focus:ring-2 focus:ring-blue-500"
        />

        <label className="mb-2 block text-sm font-semibold">Interview Level</label>
        <div className="relative mb-8 w-full">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as 'Intern' | 'Junior' | 'Senior')}
            className="w-full appearance-none rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-4 py-4 pr-12 text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
          >
            <option value="Intern">Intern (Easy questions)</option>
            <option value="Junior">Junior (Medium questions)</option>
            <option value="Senior">Senior (Hard questions)</option>
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--muted-rgb))]">
            ▼
          </div>
        </div>

        <label className="mb-3 block text-sm font-semibold">Interview Type</label>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setMode('text')}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === 'text'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))]'
            }`}
          >
            <h2 className="mb-1 text-lg font-bold">Text Interview</h2>
            <p className="text-sm text-[rgb(var(--muted-rgb))]">
              Answer questions by typing responses.
            </p>
          </button>

          <button
            onClick={() => setMode('video')}
            className={`rounded-2xl border p-5 text-left transition ${
              mode === 'video'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))]'
            }`}
          >
            <h2 className="mb-1 text-lg font-bold">Video Interview</h2>
            <p className="text-sm text-[rgb(var(--muted-rgb))]">
              Record video responses with your camera and microphone.
            </p>
          </button>
        </div>

        <button
          onClick={startInterview}
          className="w-full rounded-xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-500 active:scale-95"
        >
          Start {mode === 'video' ? 'Video' : 'Text'} Interview →
        </button>
      </div>
    </main>
  );
}