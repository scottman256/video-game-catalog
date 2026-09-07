from pathlib import Path

from app.core.config import get_settings

settings = get_settings()


class LocalDiskStorage:
    def __init__(self, base_dir: str | None = None) -> None:
        self._base_dir = Path(base_dir or settings.upload_dir)

    def save(self, subdirectory: str, filename: str, content: bytes) -> str:
        target_dir = self._base_dir / subdirectory
        target_dir.mkdir(parents=True, exist_ok=True)
        (target_dir / filename).write_bytes(content)
        return f"{subdirectory}/{filename}"

    def url_for(self, storage_key: str) -> str:
        return f"{settings.public_base_url}/uploads/{storage_key}"

    def delete(self, storage_key: str) -> None:
        (self._base_dir / storage_key).unlink(missing_ok=True)
