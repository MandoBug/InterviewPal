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
