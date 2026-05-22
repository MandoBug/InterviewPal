'use client';

import { useEffect, useState } from 'react';

interface SavedResponse {
  questionIndex: number;
  question: string;
  videoBlob: Blob;
  durationSeconds: number;
}

interface SavedInterview {
  id: string;
  role: string;
  createdAt: string;
  totalQuestions: number;
  answersRecorded: number;
  totalDurationSeconds: number;
  responses: SavedResponse[];
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function openVideoStorageDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('interviewpal-video-storage', 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('interviews')) {
        db.createObjectStore('interviews', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export default function StoragePage() {
  const [savedInterviews, setSavedInterviews] = useState<SavedInterview[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  async function loadSavedInterviews() {
    const db = await openVideoStorageDb();

    const interviews = await new Promise<SavedInterview[]>((resolve, reject) => {
      const tx = db.transaction('interviews', 'readonly');
      const request = tx.objectStore('interviews').getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    db.close();

    const sorted = interviews.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const urls: Record<string, string> = {};

    sorted.forEach((interview) => {
      interview.responses.forEach((response) => {
        urls[`${interview.id}-${response.questionIndex}`] =
          URL.createObjectURL(response.videoBlob);
      });
    });

    setSavedInterviews(sorted);
    setVideoUrls(urls);
    setOpenId(sorted[0]?.id || null);
  }

  async function clearStorage() {
    const db = await openVideoStorageDb();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('interviews', 'readwrite');
      tx.objectStore('interviews').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();

    Object.values(videoUrls).forEach((url) => URL.revokeObjectURL(url));

    setVideoUrls({});
    setSavedInterviews([]);
    setOpenId(null);
  }

  useEffect(() => {
    loadSavedInterviews();

    return () => {
      Object.values(videoUrls).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
              Video Storage
            </p>

            <h1 className="text-4xl font-extrabold">Saved Interviews</h1>

            <p className="mt-2 text-[rgb(var(--muted-rgb))]">
              Review video interviews saved in this browser.
            </p>
          </div>

          {savedInterviews.length > 0 && (
            <button
              onClick={clearStorage}
              className="rounded-xl border border-red-500/30 px-5 py-3 text-sm font-bold text-red-500 transition hover:bg-red-500/10"
            >
              Clear Saved Recordings
            </button>
          )}
        </div>

        {savedInterviews.length === 0 ? (
          <section className="rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-8 text-center shadow-xl">
            <div className="mb-4 text-6xl">🎥</div>

            <h2 className="text-2xl font-bold">No saved recordings yet</h2>

            <p className="mx-auto mt-3 max-w-2xl text-[rgb(var(--muted-rgb))]">
              Finish a video interview first. On the summary page, click
              <span className="font-bold text-blue-500"> Save to Storage</span>.
              Then your saved recordings will appear here.
            </p>
          </section>
        ) : (
          <div className="grid gap-6">
            {savedInterviews.map((interview) => {
              const isOpen = openId === interview.id;

              return (
                <section
                  key={interview.id}
                  className="rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-xl"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {interview.role} Interview
                      </h2>

                      <p className="mt-1 text-sm text-[rgb(var(--muted-rgb))]">
                        {formatDate(interview.createdAt)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                          {interview.answersRecorded}/{interview.totalQuestions} answers
                        </span>

                        <span className="rounded-full bg-[rgb(var(--background-rgb))] px-3 py-1 text-xs font-bold text-[rgb(var(--muted-rgb))]">
                          {formatTime(interview.totalDurationSeconds)}
                        </span>

                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">
                          Saved in browser
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setOpenId(isOpen ? null : interview.id)}
                      className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500"
                    >
                      {isOpen ? 'Close' : 'Open'}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-6 space-y-4">
                      {interview.responses.map((response) => {
                        const videoUrl =
                          videoUrls[`${interview.id}-${response.questionIndex}`];

                        return (
                          <div
                            key={response.questionIndex}
                            className="grid gap-4 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4 md:grid-cols-[260px_1fr]"
                          >
                            <video
                              src={videoUrl}
                              controls
                              className="aspect-video w-full rounded-xl border border-[rgb(var(--border-rgb))] object-cover"
                            />

                            <div>
                              <div className="mb-2 flex flex-wrap gap-2">
                                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                                  Question {response.questionIndex + 1}
                                </span>

                                <span className="rounded-full bg-[rgb(var(--card-rgb))] px-3 py-1 text-xs font-bold text-[rgb(var(--muted-rgb))]">
                                  {formatTime(response.durationSeconds)}
                                </span>
                              </div>

                              <p className="font-semibold">
                                {response.question}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600">
          <p className="font-bold">Storage note</p>
          <p>
            This demo saves recordings in this browser with IndexedDB. For production,
            videos should be uploaded to backend/cloud storage.
          </p>
        </div>
      </div>
    </main>
  );
}
