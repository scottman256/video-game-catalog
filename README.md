# Video Game Catalog

Track the video games you own: search or add games to a shared global catalog, note what you own and what you paid, and rate your games across five weighted categories.

> **How this was built:** This application was created with [Claude Code](https://claude.com/claude-code), using a combination of Claude Opus and Claude Sonnet. The requirements, design decisions, and direction came from a human (Scott); the implementation, tests, and documentation were written by Claude.

- **Backend** (Python / FastAPI / SQLAlchemy): see [backend/README.md](backend/README.md) for setup, running the API, migrations, and tests.
- **Frontend** (Angular): see [frontend/README.md](frontend/README.md) for setup, running the dev server, and tests.

## Quick start

In one terminal:

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # or .venv\Scripts\Activate.ps1 on Windows PowerShell
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
python scripts/seed_systems.py
uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm start
```

Then open `http://localhost:4200`, create an account, and start cataloging.

See `CLAUDE.md` for the coding style and architecture principles this codebase follows.
