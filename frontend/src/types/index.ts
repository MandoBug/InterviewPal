// ── User ──
export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── Interview ──
export type SessionStatus = "in_progress" | "completed" | "cancelled";

export interface InterviewSession {
  id: string;
  user_id: string;
  role: string;
  status: SessionStatus;
  score: number | null;
  feedback: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface InterviewQuestion {
  question: string;
  category: string;
  difficulty: string;
}

// ── Feedback (Sprint 4) ──
export interface FeedbackResult {
  score: number;
  strengths: string[];
  improvements: string[];
  filler_words: string[];
}
