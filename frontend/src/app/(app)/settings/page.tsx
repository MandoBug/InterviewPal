'use client';

import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  function updateTheme(newTheme: string) {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.dataset.theme = newTheme;
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] p-10 text-[rgb(var(--foreground-rgb))]">
      <h1 className="mb-4 text-4xl font-bold">Settings</h1>
      <p className="mb-8 text-slate-400">Manage your InterviewPal preferences.</p>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white">
        <h2 className="mb-4 text-xl font-semibold text-white">Theme</h2>

        <div className="flex gap-4">
          <button
            onClick={() => updateTheme('dark')}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            Dark
          </button>

          <button
            onClick={() => updateTheme('light')}
            className="rounded-xl bg-slate-200 px-4 py-2 font-semibold text-slate-900"
          >
            Light
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-400">
          Current theme: {theme}
        </p>
      </section>
    </main>
  );
}