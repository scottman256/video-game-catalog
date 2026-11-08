# Video Game Catalog

Track the video games you own: search or add games to a shared global catalog, note what you own and what you paid, and rate your games across five weighted categories.

> **How this was built:** This application was created with [Claude Code](https://claude.com/claude-code), using a combination of Claude Opus and Claude Sonnet. The requirements, design decisions, and direction came from a human (Scott); the implementation, tests, and documentation were written by Claude.

- **Backend** (Python / FastAPI / SQLAlchemy): see [backend/README.md](backend/README.md) for setup, running the API, migrations, and tests.
- **Frontend** (Angular): see [frontend/README.md](frontend/README.md) for setup, running the dev server, and tests.
- **Docker**: [docker-compose.yml](docker-compose.yml) runs the frontend, backend, and a PostgreSQL database together. See [Quick start with Docker](#quick-start-with-docker).

## Quick start with Docker

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with the Compose plugin). From the repository root:

```bash
docker compose up -d --build
```

Then open `http://localhost:8080`, create an account, and start cataloging. The first build takes a few minutes; later starts take seconds.

This starts three containers:

| Service | What it runs | Reachable at |
|---|---|---|
| `frontend` | Production Angular build served by nginx. nginx also proxies `/api/*` to the backend, so the browser sees a single origin. | `http://localhost:8080` |
| `backend` | FastAPI on uvicorn. Every start applies migrations and seeds the systems list (both are safe to re-run). | Through the proxy at `http://localhost:8080/api`. Swagger UI is at `http://localhost:8080/api/docs`. |
| `db` | PostgreSQL 18 | `localhost:5433` (user `catalog`, password `catalog`, database `video_game_catalog`). Bound to `127.0.0.1` only. |

Your data lives in two named Docker volumes, `postgres-data` (the database) and `uploads` (box art, screenshots, profile pictures). Both survive restarts, rebuilds, and `docker compose down`. The Docker database is separate from the SQLite file used by the non-Docker setup below. Because the two setups use different ports, you can run both at once.

Common commands:

```bash
docker compose ps                     # container status and health
docker compose logs -f backend        # follow the API logs
docker compose up -d --build          # rebuild and restart after changing code
docker compose down                   # stop and remove the containers (data volumes are kept)
docker compose exec backend python -m scripts.create_admin <username> <email> <password>
```

> **Warning:** `docker compose down -v` also deletes the volumes. That means every account, game, review, and uploaded image is gone.

### Configuration

The defaults work without any setup. To change them, copy `.env.example` to `.env` in the repository root and edit it:

| Variable | Default | Purpose |
|---|---|---|
| `FRONTEND_PORT` | `8080` | Host port for the app |
| `POSTGRES_PORT` | `5433` | Host port for connecting a database client. It isn't `5432`, so it won't clash with a local Postgres. |
| `POSTGRES_PASSWORD` | `catalog` | Database password. Postgres only reads it when the `postgres-data` volume is first created, so set it before the first `up`. |
| `JWT_SECRET_KEY` | dev-only placeholder | Signs access tokens. Set a long random value for anything beyond local use. |

The stack serves plain HTTP for local use. For a real deployment, put it behind HTTPS and set `ENVIRONMENT=production` on the backend so auth cookies get the `Secure` flag.

## Quick start without Docker

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

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every pull request to `main` and every push to `main`:

- **Backend tests and coverage** runs `pytest --cov`, but only when something under `backend/` changed.
- **Frontend tests and coverage** runs `npm run test:coverage`, but only when something under `frontend/` changed.
- Both run when the workflow file itself changes.

Either check fails if its tests fail or its coverage drops below 90%.

`main` is protected: a PR can merge only when the **CI result** check passes. That check passes when every check that ran passed, and it counts a skipped check as passing. A frontend-only PR doesn't wait for the backend check, and vice versa.

See `CLAUDE.md` for the coding style and architecture principles this codebase follows.
