'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { InterviewQuestion } from '@/types';

type Phase =
  | 'loading'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'review'
  | 'done';

interface SessionData {
  id: string;
  role: string;
  questions: InterviewQuestion[];
}

interface RecordedAnswer {
  questionIndex: number;
  question: string;
  videoBlob: Blob;
  videoUrl: string;
  durationSeconds: number;
  transcript?: string;
  feedback?: any;
}

export default function VideoInterviewPage() {
  const router = useRouter();

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const pausedStartedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('loading');
  const [role, setRole] = useState('Software Engineer');
  const [session, setSession] = useState<SessionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [recordedAnswers, setRecordedAnswers] = useState<RecordedAnswer[]>([]);
  const [currentPlaybackUrl, setCurrentPlaybackUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const currentQuestion = session?.questions[questionIndex];

  const progress =
    session && session.questions.length > 0
      ? ((questionIndex + 1) / session.questions.length) * 100
      : 0;

  const stopCamera = useCallback(() => {
    const preview = videoPreviewRef.current;

    mediaStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    if (preview) {
      const stream = preview.srcObject as MediaStream | null;

      stream?.getTracks().forEach((track) => {
        track.stop();
      });

      preview.pause();
      preview.srcObject = null;
      preview.removeAttribute('src');
      preview.load();
    }

    mediaStreamRef.current = null;
    setCameraReady(false);
  }, []);

  const cleanupCamera = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // Ignore recorder cleanup errors.
      }
    }

    mediaRecorderRef.current = null;
    stopCamera();
  }, [stopCamera]);

  async function setupCamera() {
    setError('');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    mediaStreamRef.current = stream;

    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
      await videoPreviewRef.current.play().catch(() => undefined);
    }

    setCameraReady(true);

    return stream;
  }

  const startSession = useCallback(async (selectedRole: string) => {
    const cleanRole = selectedRole.trim() || 'Software Engineer';

    setLoading(true);
    setError('');
    setPhase('loading');

    try {
      localStorage.setItem('selected_role', cleanRole);

      const res = await api.post('/api/interviews/start', {
        role: cleanRole,
        interview_type: 'video',
      });

      const questions = Array.isArray(res.data.questions)
        ? res.data.questions
        : [];

      if (questions.length === 0) {
        setError('No questions were generated.');
        return;
      }

      setSession({
        id: res.data.id,
        role: res.data.role,
        questions,
      });

      setQuestionIndex(0);
      setRecordedAnswers([]);
      setCurrentPlaybackUrl(null);
      setElapsedSeconds(0);
      setPhase('ready');
    } catch (err: unknown) {
      const message =
        (
          err as {
            response?: { data?: { detail?: string } };
          }
        )?.response?.data?.detail || 'Could not start video interview.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      router.replace('/auth');
      return;
    }

    const savedRole =
      localStorage.getItem('selected_role') || 'Software Engineer';

    setRole(savedRole);
    startSession(savedRole);

    return () => {
      cleanupCamera();
    };
  }, [router, startSession, cleanupCamera]);

  useEffect(() => {
    if (phase !== 'recording') return;

    const interval = window.setInterval(() => {
      if (!recordingStartTimeRef.current) return;

      const elapsedMs =
        Date.now() -
        recordingStartTimeRef.current -
        totalPausedMsRef.current;

      setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
    }, 500);

    return () => window.clearInterval(interval);
  }, [phase]);

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getSupportedMimeType() {
    const possibleTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];

    return possibleTypes.find((type) => MediaRecorder.isTypeSupported(type));
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

  async function saveCurrentInterviewToStorage() {
    if (!session || recordedAnswers.length === 0) {
      setSaveMessage('No recordings to save yet.');
      return;
    }

    setSaveMessage('Saving recordings...');

    try {
      const db = await openVideoStorageDb();

      const sortedAnswers = recordedAnswers
        .slice()
        .sort((a, b) => a.questionIndex - b.questionIndex);

      const totalDurationSeconds = sortedAnswers.reduce(
        (sum, answer) => sum + answer.durationSeconds,
        0
      );

      const savedInterview = {
        id: session.id,
        role,
        createdAt: new Date().toISOString(),
        totalQuestions: session.questions.length,
        answersRecorded: sortedAnswers.length,
        totalDurationSeconds,
        responses: sortedAnswers.map((answer) => ({
          questionIndex: answer.questionIndex,
          question: answer.question,
          videoBlob: answer.videoBlob,
          durationSeconds: answer.durationSeconds,
          transcript: answer.transcript,
          feedback: answer.feedback,
        })),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('interviews', 'readwrite');
        tx.objectStore('interviews').put(savedInterview);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      db.close();
      setSaveMessage('Saved to Storage. You can open the Storage page now.');
    } catch (err) {
      console.error(err);
      setSaveMessage('Could not save recordings. Try shorter recordings.');
    }
  }

  async function startRecording() {
    if (!currentQuestion) {
      setError('No question is available.');
      return;
    }

    try {
      setError('');
      setSaveMessage('');
      setCurrentPlaybackUrl(null);
      setElapsedSeconds(0);

      const stream = mediaStreamRef.current || (await setupCamera());

      chunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      pausedStartedAtRef.current = null;
      totalPausedMsRef.current = 0;

      const mimeType = getSupportedMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const durationMs =
          recordingStartTimeRef.current !== null
            ? Date.now() -
              recordingStartTimeRef.current -
              totalPausedMsRef.current
            : 0;

        const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));

        const videoBlob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm',
        });

        const videoUrl = URL.createObjectURL(videoBlob);

        setCurrentPlaybackUrl(videoUrl);

        setRecordedAnswers((prev) => {
          const filtered = prev.filter(
            (answer) => answer.questionIndex !== questionIndex
          );

          return [
            ...filtered,
            {
              questionIndex,
              question: currentQuestion.question,
              videoBlob,
              videoUrl,
              durationSeconds,
            },
          ];
        });

        setElapsedSeconds(durationSeconds);
        setPhase('review');

        mediaRecorderRef.current = null;
        stopCamera();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase('recording');
    } catch {
      setError(
        'Could not access your camera or microphone. Please allow permissions and try again.'
      );
      stopCamera();
    }
  }

  function pauseRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== 'recording') return;

    recorder.pause();
    pausedStartedAtRef.current = Date.now();
    setPhase('paused');
  }

  function resumeRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== 'paused') return;

    if (pausedStartedAtRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pausedStartedAtRef.current;
      pausedStartedAtRef.current = null;
    }

    recorder.resume();
    setPhase('recording');
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      stopCamera();
      setPhase('review');
      return;
    }

    if (recorder.state === 'paused' && pausedStartedAtRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pausedStartedAtRef.current;
      pausedStartedAtRef.current = null;
    }

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }

    window.setTimeout(() => {
      stopCamera();
    }, 100);
  }

  function rerecordAnswer() {
    stopCamera();
    setCurrentPlaybackUrl(null);
    setElapsedSeconds(0);

    setRecordedAnswers((prev) =>
      prev.filter((answer) => answer.questionIndex !== questionIndex)
    );

    setPhase('ready');
  }

  async function nextQuestion() {
    stopCamera();

    if (!session) return;

    const currentAnswer = recordedAnswers.find(
      (ans) => ans.questionIndex === questionIndex
    );

    if (currentAnswer && !currentAnswer.transcript) {
      setLoading(true);
      setError('');
      try {
        const formData = new FormData();
        formData.append('session_id', session.id);
        formData.append('question_index', String(questionIndex));
        formData.append('question_text', currentAnswer.question);
        formData.append('duration_seconds', String(currentAnswer.durationSeconds));
        formData.append('file', currentAnswer.videoBlob, `recording_q${questionIndex}.webm`);

        const res = await api.post('/api/recordings/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setRecordedAnswers((prev) =>
          prev.map((ans) =>
            ans.questionIndex === questionIndex
              ? {
                  ...ans,
                  transcript: res.data.transcript,
                  feedback: res.data.feedback ? JSON.parse(res.data.feedback) : null,
                }
              : ans
          )
        );
      } catch (err: any) {
        const msg = err?.response?.data?.detail || 'Failed to upload and grade response.';
        setError(msg);
        setLoading(false);
        return;
      }
    }

    const next = questionIndex + 1;

    if (next >= session.questions.length) {
      await finishInterview();
      return;
    }

    setQuestionIndex(next);
    setCurrentPlaybackUrl(null);
    setElapsedSeconds(0);
    setError('');
    setLoading(false);
    setPhase('ready');
  }

  async function finishInterview() {
    cleanupCamera();

    if (!session) {
      setPhase('done');
      return;
    }

    setLoading(true);

    const currentAnswer = recordedAnswers.find(
      (ans) => ans.questionIndex === questionIndex
    );

    if (currentAnswer && !currentAnswer.transcript) {
      try {
        const formData = new FormData();
        formData.append('session_id', session.id);
        formData.append('question_index', String(questionIndex));
        formData.append('question_text', currentAnswer.question);
        formData.append('duration_seconds', String(currentAnswer.durationSeconds));
        formData.append('file', currentAnswer.videoBlob, `recording_q${questionIndex}.webm`);

        const res = await api.post('/api/recordings/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setRecordedAnswers((prev) =>
          prev.map((ans) =>
            ans.questionIndex === questionIndex
              ? {
                  ...ans,
                  transcript: res.data.transcript,
                  feedback: res.data.feedback ? JSON.parse(res.data.feedback) : null,
                }
              : ans
          )
        );
      } catch (err: any) {
        // Keep moving
      }
    }

    try {
      await api.post(`/api/interviews/${session.id}/end`);

      // Fetch finalized recordings (with transcripts & feedback computed in the backend)
      const recsRes = await api.get(`/api/recordings/session/${session.id}`);
      if (Array.isArray(recsRes.data)) {
        setRecordedAnswers((prev) => {
          return recsRes.data.map((rec: any) => {
            const existing = prev.find((ans) => ans.questionIndex === rec.question_index);
            return {
              questionIndex: rec.question_index,
              question: rec.question_text,
              videoBlob: existing?.videoBlob || new Blob(),
              videoUrl: existing?.videoUrl || '',
              durationSeconds: rec.duration_seconds,
              transcript: rec.transcript,
              feedback: rec.feedback ? JSON.parse(rec.feedback) : null,
            };
          });
        });
      }
    } catch {
      // The local summary is still useful even if the backend request fails.
    } finally {
      cleanupCamera();
      setLoading(false);
      setPhase('done');
    }
  }

  function endEarly() {
    cleanupCamera();
    finishInterview();
  }

  if (phase === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
        <div className="w-full max-w-md rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-8 text-center shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
            Video Interview
          </p>

          <h1 className="mb-3 text-3xl font-extrabold">
            Preparing Session
          </h1>

          <p className="text-[rgb(var(--muted-rgb))]">
            Generating questions...
          </p>
        </div>
      </main>
    );
  }

  if (phase === 'done') {
    const totalDurationSeconds = recordedAnswers.reduce(
      (sum, answer) => sum + answer.durationSeconds,
      0
    );

    const answeredCount = recordedAnswers.length;
    const totalQuestionCount = session?.questions.length || answeredCount;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center">
            <div className="mb-4 text-6xl">🎥</div>

            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
              Video Interview Summary
            </p>

            <h1 className="mb-3 text-4xl font-extrabold">
              Interview Complete
            </h1>

            <p className="text-[rgb(var(--muted-rgb))]">
              You recorded {answeredCount} of {totalQuestionCount} answers for your{' '}
              {role} interview.
            </p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-5 shadow-sm">
              <p className="mb-1 text-sm text-[rgb(var(--muted-rgb))]">
                Role
              </p>
              <p className="text-xl font-bold">{role}</p>
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-5 shadow-sm">
              <p className="mb-1 text-sm text-[rgb(var(--muted-rgb))]">
                Answers Recorded
              </p>
              <p className="text-xl font-bold">
                {answeredCount}/{totalQuestionCount}
              </p>
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-5 shadow-sm">
              <p className="mb-1 text-sm text-[rgb(var(--muted-rgb))]">
                Total Duration
              </p>
              <p className="text-xl font-bold">
                {formatTime(totalDurationSeconds)}
              </p>
            </div>
          </div>

          <section className="mb-6 rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Recorded Responses</h2>
                <p className="text-sm text-[rgb(var(--muted-rgb))]">
                  Review the answers saved during this browser session.
                </p>
              </div>

              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                Local Preview
              </span>
            </div>

            {recordedAnswers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-8 text-center">
                <p className="font-semibold">No recordings saved</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recordedAnswers
                  .slice()
                  .sort((a, b) => a.questionIndex - b.questionIndex)
                  .map((answer) => (
                    <div
                      key={answer.questionIndex}
                      className="grid gap-4 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4 md:grid-cols-[220px_1fr]"
                    >
                      <video
                        src={answer.videoUrl}
                        controls
                        className="aspect-video w-full rounded-xl border border-[rgb(var(--border-rgb))] object-cover"
                      />

                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-500">
                            Question {answer.questionIndex + 1}
                          </span>

                          <span className="rounded-full bg-[rgb(var(--card-rgb))] px-3 py-1 text-xs font-bold text-[rgb(var(--muted-rgb))]">
                            {formatTime(answer.durationSeconds)}
                          </span>
                        </div>

                        <p className="font-semibold text-[rgb(var(--foreground-rgb))]">
                          {answer.question}
                        </p>

                        {/* AI Feedback & Transcript Box */}
                        {answer.transcript && (
                          <div className="mt-4 rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-4 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-blue-400">AI Transcript</h4>
                              {answer.feedback?.score !== undefined && (
                                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                                  Score: {answer.feedback.score}/10
                                </span>
                              )}
                            </div>
                            <p className="mb-4 text-sm text-[rgb(var(--muted-rgb))] italic">
                              "{answer.transcript}"
                            </p>

                            {answer.feedback && (
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg bg-green-500/5 p-3 border border-green-500/10">
                                  <h5 className="mb-1 text-xs font-bold text-green-400">Strengths</h5>
                                  <ul className="list-disc pl-4 text-xs text-[rgb(var(--muted-rgb))] space-y-1">
                                    {answer.feedback.strengths?.map((s: string, idx: number) => (
                                      <li key={idx}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="rounded-lg bg-amber-500/5 p-3 border border-amber-500/10">
                                  <h5 className="mb-1 text-xs font-bold text-amber-400">Improvements</h5>
                                  <ul className="list-disc pl-4 text-xs text-[rgb(var(--muted-rgb))] space-y-1">
                                    {answer.feedback.improvements?.map((imp: string, idx: number) => (
                                      <li key={idx}>{imp}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {answer.feedback?.filler_words?.length > 0 && (
                              <div className="mt-3 text-xs text-red-400">
                                <span className="font-semibold">Filler words detected: </span>
                                {answer.feedback.filler_words.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600">
            <p className="font-bold">Storage note</p>
            <p>
              Click Save to Storage to keep these recordings in this browser.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <button
              onClick={saveCurrentInterviewToStorage}
              className="rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-500 active:scale-95"
            >
              Save to Storage
            </button>

            <button
              onClick={() => router.push('/storage')}
              className="rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 active:scale-95"
            >
              Open Storage
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))]"
            >
              Dashboard
            </button>
          </div>

          {saveMessage && (
            <p className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-center text-sm font-semibold text-blue-500">
              {saveMessage}
            </p>
          )}

          <button
            onClick={() => router.push('/interview')}
            className="mt-3 w-full rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))]"
          >
            Practice Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <h2 className="mb-2 text-2xl font-bold">Transcribing & Grading</h2>
            <p className="text-[rgb(var(--muted-rgb))]">
              AssemblyAI and Claude are evaluating your response. Please wait...
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
              Video Interview
            </p>

            <h1 className="text-4xl font-extrabold">
              {role} Practice Session
            </h1>

            <p className="mt-2 text-[rgb(var(--muted-rgb))]">
              Record your answer and move through questions one by one.
            </p>
          </div>

          <button
            onClick={endEarly}
            className="rounded-xl border border-[rgb(var(--border-rgb))] px-5 py-3 text-sm font-semibold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))]"
          >
            End Early
          </button>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-[rgb(var(--muted-rgb))]">
              Question {questionIndex + 1} of {session?.questions.length || 0}
            </span>

            <span className="font-medium text-blue-500">
              {phase === 'recording' && `Recording ${formatTime(elapsedSeconds)}`}
              {phase === 'paused' && `Paused at ${formatTime(elapsedSeconds)}`}
              {phase === 'ready' && 'Camera Off / Ready'}
              {phase === 'review' && 'Review Answer'}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-[rgb(var(--card-rgb))]">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Camera Preview</h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  cameraReady
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-slate-500/10 text-slate-400'
                }`}
              >
                {cameraReady ? 'Camera On' : 'Camera Off'}
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[rgb(var(--border-rgb))] bg-black">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />

              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black text-sm font-semibold text-slate-400">
                  Camera is off
                </div>
              )}

              {(phase === 'recording' || phase === 'paused') && (
                <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  {phase === 'paused' ? 'Paused' : 'Recording'}
                </div>
              )}
            </div>

            {currentPlaybackUrl && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                  Recorded Answer Preview
                </h3>

                <video
                  src={currentPlaybackUrl}
                  controls
                  className="w-full rounded-2xl border border-[rgb(var(--border-rgb))]"
                />
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-xl">
            <div className="mb-4">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
                Current Question
              </p>

              <h2 className="text-2xl font-bold">
                {currentQuestion?.question}
              </h2>
            </div>

            <div className="mb-6 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4">
              <p className="mb-2 text-sm font-semibold text-[rgb(var(--muted-rgb))]">
                Recording Tips
              </p>

              <ul className="space-y-2 text-sm text-[rgb(var(--muted-rgb))]">
                <li>• Speak clearly and confidently</li>
                <li>• Structure your answer before responding</li>
                <li>• Keep eye contact with the camera</li>
                <li>• Use examples when possible</li>
              </ul>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {phase === 'ready' && (
                <button
                  onClick={startRecording}
                  className="w-full rounded-xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-500"
                >
                  Start Recording
                </button>
              )}

              {phase === 'recording' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={pauseRecording}
                    className="rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold transition hover:bg-[rgb(var(--background-rgb))]"
                  >
                    Pause Recording
                  </button>

                  <button
                    onClick={stopRecording}
                    className="rounded-xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-500"
                  >
                    Stop Recording
                  </button>
                </div>
              )}

              {phase === 'paused' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={resumeRecording}
                    className="rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500"
                  >
                    Resume Recording
                  </button>

                  <button
                    onClick={stopRecording}
                    className="rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold transition hover:bg-[rgb(var(--background-rgb))]"
                  >
                    Finish Answer
                  </button>
                </div>
              )}

              {phase === 'review' && (
                <div className="grid gap-3">
                  <button
                    onClick={nextQuestion}
                    className="rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500"
                  >
                    {questionIndex + 1 >= (session?.questions.length || 0)
                      ? 'Finish Interview'
                      : 'Next Question →'}
                  </button>

                  <button
                    onClick={rerecordAnswer}
                    className="rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold transition hover:bg-[rgb(var(--background-rgb))]"
                  >
                    Re-record Answer
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
