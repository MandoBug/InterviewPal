'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { InterviewQuestion, FeedbackResult } from '@/types';

type Phase = 'setup' | 'question' | 'feedback' | 'done';

interface SessionData {
  id: string;
  role: string;
  questions: InterviewQuestion[];
}

export default function InterviewPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('setup');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [session, setSession] = useState<SessionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [allFeedback, setAllFeedback] = useState<FeedbackResult[]>([]);

  async function startSession() {
    if (!role.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/interviews/start', { role });
      setSession({ id: res.data.id, role: res.data.role, questions: res.data.questions });
      setPhase('question');
    } catch {
      setError('Could not start session. Make sure you are signed in.');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!answer.trim() || !session) return;
    setLoading(true);
    setError('');
    try {
      const currentQ = session.questions[questionIndex];
      const res = await api.post(`/api/interviews/${session.id}/answer`, {
        question: currentQ.question,
        answer,
      });
      setFeedback(res.data.feedback);
      setAllFeedback((prev) => [...prev, res.data.feedback]);
      setPhase('feedback');
    } catch {
      setError('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function nextQuestion() {
    if (!session) return;
    const next = questionIndex + 1;
    if (next >= session.questions.length) {
      await endSession();
    } else {
      setQuestionIndex(next);
      setAnswer('');
      setFeedback(null);
      setPhase('question');
    }
  }

  async function endSession() {
    if (!session) return;
    setLoading(true);
    try {
      await api.post(`/api/interviews/${session.id}/end`);
    } finally {
      setLoading(false);
      setPhase('done');
    }
  }

  const avgScore =
    allFeedback.length > 0
      ? Math.round(allFeedback.reduce((sum, f) => sum + f.score, 0) / allFeedback.length)
      : 0;

  // ── Setup ──
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Start Interview</h1>
          <p className="text-slate-500 mb-8">Enter the role you are interviewing for and we will generate tailored questions.</p>

          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startSession()}
            placeholder="e.g. Software Engineer, Product Manager"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          <button
            onClick={startSession}
            disabled={loading || !role.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            {loading ? 'Generating questions…' : 'Start →'}
          </button>
        </div>
      </div>
    );
  }

  // ── Question ──
  if (phase === 'question' && session) {
    const q = session.questions[questionIndex];
    const progress = ((questionIndex) / session.questions.length) * 100;

    return (
      <div className="min-h-screen p-8 max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500 font-medium">
            Question {questionIndex + 1} of {session.questions.length}
          </span>
          <span className="text-sm text-slate-400">{session.role}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mb-8">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-full capitalize">
              {q.category}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full capitalize">
              {q.difficulty}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-800">{q.question}</p>
        </div>

        {/* Answer */}
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here…"
          rows={6}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={submitAnswer}
            disabled={loading || !answer.trim()}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            {loading ? 'Analyzing…' : 'Submit Answer'}
          </button>
          <button
            onClick={endSession}
            className="px-5 py-3 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-medium transition-all"
          >
            End Early
          </button>
        </div>
      </div>
    );
  }

  // ── Feedback ──
  if (phase === 'feedback' && feedback && session) {
    const q = session.questions[questionIndex];
    const isLast = questionIndex + 1 >= session.questions.length;

    return (
      <div className="min-h-screen p-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Answer Feedback</h2>
        <p className="text-slate-500 mb-6 text-sm">Question {questionIndex + 1} of {session.questions.length}</p>

        {/* Score */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4 flex items-center gap-6">
          <div className="text-5xl font-extrabold text-blue-600">{feedback.score}<span className="text-2xl text-slate-300">/10</span></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Your question</p>
            <p className="text-slate-700 text-sm">{q.question}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-green-700 mb-2">Strengths</h3>
            <ul className="space-y-1">
              {feedback.strengths.map((s, i) => <li key={i} className="text-sm text-green-800">• {s}</li>)}
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-700 mb-2">Areas to Improve</h3>
            <ul className="space-y-1">
              {feedback.improvements.map((s, i) => <li key={i} className="text-sm text-amber-800">• {s}</li>)}
            </ul>
          </div>
        </div>

        {feedback.filler_words.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-slate-600 mb-1">Filler words detected</h3>
            <p className="text-sm text-slate-500">{feedback.filler_words.join(', ')}</p>
          </div>
        )}

        <button
          onClick={nextQuestion}
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-95 mt-2"
        >
          {loading ? 'Loading…' : isLast ? 'Finish Interview' : 'Next Question →'}
        </button>
      </div>
    );
  }

  // ── Done ──
  if (phase === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Interview Complete!</h1>
          <p className="text-slate-500 mb-8">Great job practicing. Here's your summary.</p>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 text-left">
            <p className="text-sm text-slate-500 mb-1">Average Score</p>
            <p className="text-5xl font-extrabold text-blue-600 mb-4">
              {avgScore}<span className="text-2xl text-slate-300">/10</span>
            </p>
            <p className="text-sm text-slate-500">{allFeedback.length} questions answered</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('setup'); setRole(''); setSession(null); setQuestionIndex(0); setAllFeedback([]); }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95"
            >
              Practice Again
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl transition-all"
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
