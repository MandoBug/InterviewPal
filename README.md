# InterviewPal

AI-powered mock interview preparation platform for UCSC students.

**Live App:** https://interview-pal-omega.vercel.app
**Backend API:** https://interviewpal-production-9b90.up.railway.app/docs

---

## Team

| Name | Role |
|---|---|
| Armando Tamayo | Product Owner |
| Jerry Chen | Scrum Master |
| Yang Chao | Developer |
| Akshay Rajendran | Developer |
| Theo Hudson | Developer |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 |
| Cache | Redis |
| AI | Anthropic Claude / Groq (Llama) |
| Transcription | AssemblyAI / OpenAI Whisper |
| Hosting | Vercel (frontend) + Railway (backend) |

---

## Features

- Sign up / sign in with JWT authentication
- Text and video interview modes
- AI-generated questions tailored to job role, experience level, and difficulty
- Per-answer AI feedback: score (1–10), strengths, improvements, filler word detection
- Video recording with pause/resume/restart controls and browser playback
- Session history, stats, and progress chart on profile page
- Email summary sent after completing an interview
- Dark/light mode toggle
- Saved recordings management with individual delete

---

## Scrum Documents

| Document | Link |
|---|---|
| Release Plan | https://docs.google.com/document/d/13Jqi1jiFlav_--dW20AWV1a9BB19D-Uwe-Kj9hmTpW0/edit |
| Sprint 1 Plan | https://docs.google.com/document/d/1QpKv4nKTMJOcpIEQS2EjqM__kHh_dNmEJzpvLWf5VY8/edit |
| Sprint 1 Report | https://docs.google.com/document/d/1qs2t7avDfZddFu7wo-kFmuDrUVMs6LsesWgPsFCtOP0/edit |
| Sprint 2 Plan | https://docs.google.com/document/d/1dnbutO7fs4uKghcTNi_BIQOJfUIBpy02ooXU-bmqras/edit |

---

## Release Summary

### Key User Stories and Acceptance Criteria

| User Story | Acceptance Criteria | Status |
|---|---|---|
| Sign up and log in | User can create account, log in, receive JWT, and be redirected to dashboard | ✅ Done |
| Start a text interview | User selects role, receives 5 AI-generated questions, answers one at a time | ✅ Done |
| Receive AI feedback | After each answer, user sees score, strengths, improvements, and filler words | ✅ Done |
| Record a video interview | User can record video responses with start/pause/stop controls | ✅ Done |
| View saved recordings | Recordings saved in browser and viewable on storage page | ✅ Done |
| Delete a recording | User can delete individual saved recordings with confirmation | ✅ Done |
| View profile and stats | User can view completed session count, average scores, and progress chart | ✅ Done |
| Receive email summary | User receives HTML email recap after finishing an interview | ✅ Done |

### Known Bugs and Limitations

- Email summary requires manual SMTP configuration — disabled by default
- Video transcription requires AssemblyAI or OpenAI API key — falls back to static feedback without it
- AI question generation falls back to hardcoded questions if no API key is configured
- Session history on dashboard only shows the 5 most recent completed sessions
- Video recordings are stored in browser IndexedDB — clearing browser data removes them

### Product Backlog (Future Work)

- Cloud video storage (AWS S3) for persistent recordings across devices
- Password reset / forgot password flow
- Interview question bank with community contributions
- Shareable feedback reports
- Mobile app version

---

## Test Plan and Report

Tests are located in `backend/tests/`. Run with:

```bash
docker compose exec -e PYTHONPATH=/app backend pytest tests/ -v
```

### Test Coverage

| Test File | What It Tests |
|---|---|
| `test_auth.py` | Signup, login, duplicate email, wrong password, `/me` endpoint |
| `test_interviews.py` | Start session, submit answer, end session, get session |
| `test_recordings.py` | Upload recording, invalid file type, get by session, delete, auth checks |

All tests use an in-memory SQLite database and mock the AI/transcription APIs so no external services are needed to run them.

---

## Installation — Local Development

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.11+

### Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/MandoBug/InterviewPal.git
cd InterviewPal

# 2. Copy and fill in environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — add your GROQ_API_KEY at minimum

# 3. Start everything
docker compose up --build

# 4. Run database migrations (first time only)
docker compose exec -e PYTHONPATH=/app backend alembic upgrade head
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

### Without Docker

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your vars
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Random string for JWT signing |
| `GROQ_API_KEY` | Recommended | Free AI key from console.groq.com |
| `ANTHROPIC_API_KEY` | Optional | Paid — higher quality AI responses |
| `ASSEMBLYAI_API_KEY` | Optional | Free — video transcription |
| `OPENAI_API_KEY` | Optional | Fallback transcription (Whisper) |
| `MAIL_ENABLED` | Optional | Set `true` to enable email summaries |
| `MAIL_USERNAME` | Optional | Gmail address for sending emails |
| `MAIL_PASSWORD` | Optional | Gmail app password |

---

## Project Structure

```
InterviewPal/
├── frontend/          # Next.js app
│   └── src/
│       ├── app/       # Pages (dashboard, interview, profile, auth)
│       ├── components/# Sidebar, ThemeProvider
│       └── lib/       # Axios API client
├── backend/
│   ├── app/
│   │   ├── api/routes/    # auth, interviews, recordings
│   │   ├── models/        # User, InterviewSession, Recording
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   └── services/      # ai_service, email_service, transcription_service
│   ├── alembic/           # Database migrations
│   └── tests/             # pytest test suite
├── docker-compose.yml
└── railway.toml
```
