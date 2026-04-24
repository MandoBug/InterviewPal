# InterviewPal

AI-powered mock interview preparation platform.

## Team

| Name              | Role           |
|-------------------|----------------|
| Armando Tamayo    | Product Owner  |
| Jerry Chen        | Scrum Master   |
| Yang Chao         | Developer      |
| Akshay Rajendran  | Developer      |
| Theo Hudson       | Developer      |

## Tech Stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Frontend    | React + Next.js (TypeScript)|
| Backend     | FastAPI (Python)            |
| Database    | PostgreSQL                  |
| Cache       | Redis                       |
| AI          | Claude / OpenAI API         |
| Storage     | AWS S3                      |
| Hosting     | Vercel (FE) + Railway (BE)  |
| CDN/Proxy   | Cloudflare                  |

## Project Structure

```
InterviewPal/
├── frontend/          # Next.js app
├── backend/           # FastAPI app
├── docs/              # Documentation
├── .github/workflows/ # CI/CD
├── docker-compose.yml # Local dev environment
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Redis

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in your env vars
alembic upgrade head       # Run database migrations
uvicorn app.main:app --reload
```

Backend runs at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Fill in your env vars
npm run dev
```

Frontend runs at `http://localhost:3000`

### Docker (Full Stack)

```bash
docker-compose up --build
```

## Sprint Overview

| Sprint | Focus                        | Goal                                      |
|--------|------------------------------|--------------------------------------------|
| 1      | Foundation & User Management | Auth, role selection, dashboard            |
| 2      | Interview System             | Interview sessions, AI question generation |
| 3      | Recording & Media            | Recording and playback                     |
| 4      | AI Feedback & Analytics      | AI feedback, scoring, email summaries      |

## Scrum Boards

### Sprint 1 Scrum Board — Foundation & User Management

| User Story | To-Do | In Progress | Done |
|-----------|-------|-------------|------|
| Sign Up | Final backend integration, full testing | Signup UI, client-side validation, backend endpoint, password hashing, error handling | Initial signup flow |
| Secure Login | Session/JWT validation, full testing | Login UI, backend endpoint, password verification, secure token handling | Basic login flow |
| Logout | Final testing | Clear cookies/local storage, redirect handling | Logout button, basic logout flow |
| Session Security | Protected route testing | Middleware setup, frontend auth state handling, session handling | Initial auth middleware |
| Role Selection | Final persistence testing | Backend preference storage, validation | Role selection UI |
| Dashboard Layout | UI polish, responsive styling | Navigation UI, placeholder components | Basic dashboard scaffold |

---

### Sprint 2 Scrum Board — Interview Orchestration

| User Story | To-Do | In Progress | Done |
|-----------|-------|-------------|------|
| Start Interview Session | Start button, routing, backend session endpoint, session state storage, testing | — | — |
| Role-Based AI Question Generation | Backend endpoint, AI API integration, prompt setup, response parsing, error handling, testing | — | — |
| Question Navigation | UI display, next button, state management, edge case handling, testing | — | — |
| Question Generation UI Feedback | Loading indicator, status message, loading state handling, testing | — | — |

