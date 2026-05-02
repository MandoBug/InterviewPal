# InterviewPal

AI-powered mock interview practice app.

## Sprint 2 complete flow

Sprint 2 covers:

1. Start a new interview session from the dashboard.
2. Use the selected role to generate role-based interview questions.
3. Show questions one at a time with next-question bounds protection.
4. Show a loading message while questions are being generated.

The AI service now has a safe fallback question generator, so the Sprint 2 demo still works even when `ANTHROPIC_API_KEY` is not set.

## Run with Docker

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs

If the database is new, run migrations from another terminal:

```bash
docker compose exec backend alembic upgrade head
```

## Run locally without Docker

Start PostgreSQL on port `5433`, then from `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

From `frontend/`:

```bash
npm install
npm run dev
```

## Demo steps

1. Sign up or sign in.
2. On the dashboard, choose a role.
3. Click **Start Interview**.
4. Wait for the **Generating questions...** message to finish.
5. Answer a question, submit it, view feedback, and continue one question at a time.

Project links

release plan:
https://docs.google.com/document/d/13Jqi1jiFlav_--dW20AWV1a9BB19D-Uwe-Kj9hmTpW0/edit?tab=t.0#heading=h.roimt6l1sgb5

sprint 1 plan:
https://docs.google.com/document/d/1QpKv4nKTMJOcpIEQS2EjqM__kHh_dNmEJzpvLWf5VY8/edit?tab=t.0#heading=h.smt3uuomxvwp

sprint 1 report:
https://docs.google.com/document/d/1qs2t7avDfZddFu7wo-kFmuDrUVMs6LsesWgPsFCtOP0/edit?tab=t.0

sprint 2 plan:
https://docs.google.com/document/d/1dnbutO7fs4uKghcTNi_BIQOJfUIBpy02ooXU-bmqras/edit?tab=t.0
