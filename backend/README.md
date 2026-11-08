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

Create an admin account, or promote an existing account to admin (an existing account keeps its password):

```bash
python -m scripts.create_admin <username> <email> <password>
```

This script skips the registration password rules, so use a strong password anywhere other than local development. Admins review player-submitted games in the approval queue, can edit any game in the global catalog, and can act as a player through "Assume User". Games that players submit stay hidden from everyone but the submitter until an admin approves them.

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

To also measure line and branch coverage of `app/` and `scripts/`:

```bash
pytest --cov
```

This prints the files that aren't fully covered, with the missing lines. The run fails if total coverage drops below 90% (set under `[tool.coverage]` in `pyproject.toml`). Coverage isn't on by default, because the threshold would fail any run of just a few test files.

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

Install the Postgres driver. It's an optional extra because local dev uses SQLite:

```bash
pip install -e ".[dev,postgres]"
```

Then run `alembic upgrade head` and the seed script against that database. The codebase deliberately avoids SQLite- or Postgres-only constructs (no native `ENUM`, no dialect-specific types) so the same models and migrations work unchanged — but it's worth running the test suite once against a real Postgres instance (via `DATABASE_URL` override) before deploying, to catch any dialect drift (e.g. title-search case sensitivity).

If the Docker stack is running, its database is a ready-made Postgres instance at `postgresql+psycopg2://catalog:catalog@localhost:5433/video_game_catalog`.

## Running in Docker

The [Dockerfile](Dockerfile) builds a Python 3.14 image that includes the Postgres driver and runs as a non-root user. Each time the container starts, it:

1. applies migrations (`alembic upgrade head`)
2. seeds the systems list (`scripts/seed_systems.py`)
3. starts uvicorn on port 8000 (without `--reload`)

Configuration uses the same environment variables as the `.env` table above. The image deliberately leaves out `.env`, local `*.db` files, `tests/`, and `app/uploads/`, so local dev data never ends up in it.

Usually you run it through the root [docker-compose.yml](../docker-compose.yml) (see the [root README](../README.md#quick-start-with-docker)), which points `DATABASE_URL` at the `db` container and mounts a volume at `/app/app/uploads`. Compose also sets `UVICORN_ROOT_PATH=/api` because the API is served behind nginx's `/api` prefix. Without it, Swagger UI at `/api/docs` would request `/openapi.json` from the wrong path. Run one-off scripts inside the running container:

```bash
docker compose exec backend python -m scripts.create_admin <username> <email> <password>
```
