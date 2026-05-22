'use client';

const mockInterviews = [
  {
    id: '1',
    role: 'Software Engineer',
    date: 'May 22, 2026',
    time: '11:42 PM',
    answers: 5,
    duration: '8:34',
  },
  {
    id: '2',
    role: 'Product Manager',
    date: 'May 19, 2026',
    time: '4:15 PM',
    answers: 4,
    duration: '6:12',
  },
  {
    id: '3',
    role: 'UX Designer',
    date: 'May 14, 2026',
    time: '2:30 PM',
    answers: 5,
    duration: '9:01',
  },
];

export default function StoragePage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
            Video Storage
          </p>

          <h1 className="text-4xl font-extrabold">Saved Interviews</h1>

          <p className="mt-2 text-[rgb(var(--muted-rgb))]">
            Review previous video interview recordings and session details.
          </p>
        </div>

        <section className="rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Recordings</h2>

            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
              Mock UI
            </span>
          </div>

          <div className="grid gap-4">
            {mockInterviews.map((interview) => (
              <div
                key={interview.id}
                className="grid gap-4 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4 transition hover:shadow-md md:grid-cols-[180px_1fr_auto]"
              >
                <div className="flex aspect-video items-center justify-center rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))]">
                  <span className="text-4xl">🎥</span>
                </div>

                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-bold">
                    {interview.role} Interview
                  </h3>

                  <p className="mt-1 text-sm text-[rgb(var(--muted-rgb))]">
                    {interview.date} at {interview.time}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                      {interview.answers} answers
                    </span>

                    <span className="rounded-full bg-[rgb(var(--card-rgb))] px-3 py-1 text-xs font-bold text-[rgb(var(--muted-rgb))]">
                      {interview.duration}
                    </span>
                  </div>
                </div>

                <div className="flex items-center">
                  <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500">
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600">
          This is frontend-only mock data for now. Later, this page can call the
          backend with <code className="font-bold">GET /api/videos</code> or{' '}
          <code className="font-bold">GET /api/interviews/recordings</code>.
        </p>
      </div>
    </main>
  );
}