'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FeedbackResult, InterviewQuestion } from '@/types';

type Phase = 'loading' | 'question' | 'feedback' | 'done';

interface SessionData {
  id: string;
  role: string;
  questions: InterviewQuestion[];
}

export default function TextInterviewPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [role, setRole] = useState('Software Engineer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [session, setSession] = useState<SessionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [allFeedback, setAllFeedback] = useState<FeedbackResult[]>([]);

  const startSession = useCallback(async (selectedRole: string) => {
    const cleanRole = selectedRole.trim() || 'Software Engineer';

    setLoading(true);
    setError('');
    setPhase('loading');

    try {
      localStorage.setItem('selected_role', cleanRole);

      const res = await api.post('/api/interviews/start', {
        role: cleanRole,
      });

      const questions = Array.isArray(res.data.questions) ? res.data.questions : [];

      if (questions.length === 0) {
        setError('No questions were generated. Please try another role.');
        return;
      }

      setSession({
        id: res.data.id,
        role: res.data.role,
        questions,
      });

      setQuestionIndex(0);
      setAnswer('');
      setFeedback(null);
      setAllFeedback([]);
      setPhase('question');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not start session. Make sure you are signed in and the backend is running.';

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

    const savedRole = localStorage.getItem('selected_role') || 'Software Engineer';
    setRole(savedRole);
    startSession(savedRole);
  }, [router, startSession]);

  async function submitAnswer() {
    if (!answer.trim() || !session) return;

    setLoading(true);
    setError('');

    try {
      const currentQ = session.questions[questionIndex];

      const res = await api.post(`/api/interviews/${session.id}/answer`, {
        question: currentQ.question,
        answer: answer.trim(),
      });

      setFeedback(res.data.feedback);
      setAllFeedback((prev) => [...prev, res.data.feedback]);
      setPhase('feedback');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to submit answer. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function nextQuestion() {
    if (!session) return;

    const next = questionIndex + 1;

    if (next >= session.questions.length) {
      await endSession();
      return;
    }

    setQuestionIndex(next);
    setAnswer('');
    setFeedback(null);
    setError('');
    setPhase('question');
  }

  async function endSession() {
    if (!session) return;

    setLoading(true);

    try {
      await api.post(`/api/interviews/${session.id}/end`);
    } catch {
      // The local summary is still useful even if the end-session request fails.
    } finally {
      setLoading(false);
      setPhase('done');
    }
  }

  const avgScore =
    allFeedback.length > 0
      ? Math.round(allFeedback.reduce((sum, item) => sum + item.score, 0) / allFeedback.length)
      : 0;

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
        <div className="w-full max-w-md rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-8 text-center shadow-xl">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-500">
            Text Interview
          </p>

          <h1 className="mb-3 text-3xl font-extrabold">
            Generating Questions
          </h1>

          <p className="mb-6 text-[rgb(var(--muted-rgb))]">
            Creating role-specific questions for your {role} interview.
          </p>

          {error ? (
            <>
              <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/interview')}
                  className="flex-1 rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--background-rgb))]"
                >
                  Back
                </button>

                <button
                  onClick={() => startSession(role)}
                  className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 active:scale-95"
                >
                  Try Again
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-500">
              This usually takes a few seconds...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'question' && session) {
    const currentQuestion = session.questions[questionIndex];
    const progress = ((questionIndex + 1) / session.questions.length) * 100;

    return (
      <div className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[rgb(var(--muted-rgb))]">
              Question {questionIndex + 1} of {session.questions.length}
            </span>

            <span className="text-sm text-blue-500">
              {session.role}
            </span>
          </div>

          <div className="mb-8 h-2 w-full rounded-full bg-[rgb(var(--card-rgb))]">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mb-6 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-sm">
            <div className="mb-4 flex gap-2">
              <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold capitalize text-blue-500">
                {currentQuestion.category}
              </span>

              <span className="rounded-full bg-[rgb(var(--background-rgb))] px-2 py-1 text-xs font-semibold capitalize text-[rgb(var(--muted-rgb))]">
                {currentQuestion.difficulty}
              </span>
            </div>

            <p className="text-lg font-semibold text-[rgb(var(--foreground-rgb))]">
              {currentQuestion.question}
            </p>
          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={6}
            className="mb-4 w-full resize-none rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] px-4 py-3 text-sm text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
          />

          {error && (
            <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={submitAnswer}
              disabled={loading || !answer.trim()}
              className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60 active:scale-95"
            >
              {loading ? 'Analyzing...' : 'Submit Answer'}
            </button>

            <button
              onClick={endSession}
              className="rounded-xl border border-[rgb(var(--border-rgb))] px-5 py-3 text-sm font-medium text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))]"
            >
              End Early
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'feedback' && feedback && session) {
    const currentQuestion = session.questions[questionIndex];
    const isLast = questionIndex + 1 >= session.questions.length;

    return (
      <div className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-1 text-2xl font-extrabold">
            Answer Feedback
          </h2>

          <p className="mb-6 text-sm text-[rgb(var(--muted-rgb))]">
            Question {questionIndex + 1} of {session.questions.length}
          </p>

          <div className="mb-4 flex items-center gap-6 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-sm">
            <div className="text-5xl font-extrabold text-blue-400">
              {feedback.score}
              <span className="text-2xl text-[rgb(var(--muted-rgb))]">
                /10
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-[rgb(var(--muted-rgb))]">
                Your question
              </p>

              <p className="text-sm text-[rgb(var(--foreground-rgb))]">
                {currentQuestion.question}
              </p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
              <h3 className="mb-2 text-sm font-bold text-green-500">
                Strengths
              </h3>

              <ul className="space-y-1">
                {feedback.strengths.map((item, i) => (
                  <li key={i} className="text-sm text-[rgb(var(--foreground-rgb))]">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <h3 className="mb-2 text-sm font-bold text-amber-500">
                Areas to Improve
              </h3>

              <ul className="space-y-1">
                {feedback.improvements.map((item, i) => (
                  <li key={i} className="text-sm text-[rgb(var(--foreground-rgb))]">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {feedback.filler_words.length > 0 && (
            <div className="mb-4 rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-4">
              <h3 className="mb-1 text-sm font-bold text-[rgb(var(--foreground-rgb))]">
                Filler words detected
              </h3>

              <p className="text-sm text-[rgb(var(--muted-rgb))]">
                {feedback.filler_words.join(', ')}
              </p>
            </div>
          )}

          <button
            onClick={nextQuestion}
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60 active:scale-95"
          >
            {loading ? 'Loading...' : isLast ? 'Finish Interview' : 'Next Question →'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))]">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-6xl">🎉</div>

          <h1 className="mb-2 text-3xl font-extrabold">
            Interview Complete!
          </h1>

          <p className="mb-8 text-[rgb(var(--muted-rgb))]">
            Great job practicing. Here is your local summary.
          </p>

          <div className="mb-6 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 text-left shadow-sm">
            <p className="mb-1 text-sm text-[rgb(var(--muted-rgb))]">
              Average Score
            </p>

            <p className="mb-4 text-5xl font-extrabold text-blue-400">
              {avgScore}
              <span className="text-2xl text-[rgb(var(--muted-rgb))]">
                /10
              </span>
            </p>

            <p className="text-sm text-[rgb(var(--muted-rgb))]">
              {allFeedback.length} questions answered
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push('/interview')}
              className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500 active:scale-95"
            >
              Practice Again
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 rounded-xl border border-[rgb(var(--border-rgb))] py-3 font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))]"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}