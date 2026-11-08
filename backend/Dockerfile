FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore

WORKDIR /app

# Only pyproject.toml is present here, so this installs just the dependencies and the layer
# stays cached until they change. The source is copied afterwards and imported via PYTHONPATH.
COPY pyproject.toml ./
RUN pip install ".[postgres]" && rm -rf build *.egg-info

COPY alembic.ini ./
COPY alembic ./alembic
COPY scripts ./scripts
COPY app ./app

RUN useradd --system --no-create-home catalog \
    && mkdir -p app/uploads \
    && chown catalog app/uploads
USER catalog

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

CMD ["sh", "-c", "alembic upgrade head && python scripts/seed_systems.py && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
