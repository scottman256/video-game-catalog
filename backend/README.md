# Video Game Catalog — Backend

FastAPI + SQLAlchemy + Alembic API for the video game catalog. Uses a 3-layer architecture: `api/routers` (HTTP) → `services` (business logic) → `repositories` (data access). SQLite locally, PostgreSQL in production, switched purely via `DATABASE_URL`.

## Prerequisites

- Python 3.13+ (developed and tested against 3.14)

## Setup

```bash
python -m venv .venv
```

Activate it:

- Windows (Command Prompt): `.venv\Scripts\activate.bat`
- Windows (PowerShell): `.venv\Scripts\Activate.ps1`
- Windows (Git Bash): `source .venv/Scripts/activate`
- macOS/Linux: `source .venv/bin/activate`

Install dependencies (including test tools):

```bash
pip install -e ".[dev]"
```

Copy the environment template and adjust as needed:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Purpose | Local default |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./video_game_catalog.db` (swap for a `postgresql+psycopg2://...` URL in production) |
| `JWT_SECRET_KEY` | Signs access tokens | dev-only placeholder — **must** be overridden in production |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_TTL_MINUTES` | Access cookie lifetime | `15` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh cookie lifetime | `7` |
| `UPLOAD_DIR` | Where box art/screenshots are stored on disk | `app/uploads` |
| `CORS_ORIGINS` | Allowed frontend origins (JSON array) | `["http://localhost:4200"]` |
| `PUBLIC_BASE_URL` | Base URL used to build absolute image URLs (box art/screenshots) returned by the API | `http://localhost:8000` — must match wherever the backend is actually reachable, since the frontend loads images directly from this URL |
| `ENVIRONMENT` | `development` or `production` — controls the `Secure` cookie flag | `development` |

## Database setup

Apply migrations:

```bash
alembic upgrade head
```

Seed the video game systems dropdown (NES onward, idempotent — safe to re-run):

```bash
python scripts/seed_systems.py
```

The SQLite database file (`video_game_catalog.db`) persists in this directory across restarts; delete it and re-run the two commands above for a clean slate.

## Running the API

```bash
uvicorn app.main:app --reload
```

Serves at `http://localhost:8000`. Interactive API docs (Swagger UI) at `http://localhost:8000/docs`.

## Running tests

```bash
pytest
```

Runs the full unit + integration suite (repositories, services, and full HTTP-level flows through `TestClient`) against an isolated in-memory SQLite database — it never touches your local `video_game_catalog.db`.

## Creating a new migration

After changing a model in `app/models/`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Review the generated migration before committing — autogenerate doesn't always get constraints exactly right.

## Project layout

```
app/
  core/        # settings, security (Argon2 + JWT), time helpers
  db/          # SQLAlchemy engine/session
  models/      # ORM models
  schemas/     # Pydantic request/response DTOs
  api/         # routers + shared dependencies (auth, storage)
  services/    # business logic
  repositories/# database queries — the only layer that touches SQLAlchemy Session queries
  storage/     # file storage abstraction (local disk today, swappable for S3-compatible later)
tests/
  unit/        # repository and service tests
  integration/ # full HTTP flow tests via TestClient
```

## Switching to PostgreSQL

Point `DATABASE_URL` at a Postgres instance, e.g.:

```
DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/video_game_catalog
```

Install a Postgres driver (not included by default, since local dev uses SQLite):

```bash
pip install psycopg2-binary
```

Then run `alembic upgrade head` and the seed script against that database. The codebase deliberately avoids SQLite- or Postgres-only constructs (no native `ENUM`, no dialect-specific types) so the same models and migrations work unchanged — but it's worth running the test suite once against a real Postgres instance (via `DATABASE_URL` override) before deploying, to catch any dialect drift (e.g. title-search case sensitivity).
