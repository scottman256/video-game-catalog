import io

import pytest
from PIL import Image

from app.repositories.game_repository import GameRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import InvalidImageError
from app.services.game_image_service import GameImageService
from app.storage.local_disk_storage import LocalDiskStorage


def _make_game(db_session) -> int:
    system_id = SystemRepository(db_session).create("Nintendo Entertainment System", 1985).id
    user_id = UserRepository(db_session).create(username="scott", email="scott@example.com").id
    return GameRepository(db_session).create("Super Mario Bros.", None, 1985, system_id, "E", user_id).id


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="red").save(buffer, format="PNG")
    return buffer.getvalue()


def test_add_image_saves_box_art_and_creates_record(db_session, tmp_path):
    game_id = _make_game(db_session)
    service = GameImageService(db_session, LocalDiskStorage(str(tmp_path)))

    image = service.add_image(game_id, "box_art", _png_bytes())

    assert image.kind == "box_art"
    assert (tmp_path / image.storage_key).exists()


def test_add_image_rejects_oversized_upload(db_session, tmp_path):
    game_id = _make_game(db_session)
    service = GameImageService(db_session, LocalDiskStorage(str(tmp_path)))
    oversized_content = b"0" * (5 * 1024 * 1024 + 1)

    with pytest.raises(InvalidImageError):
        service.add_image(game_id, "screenshot", oversized_content)


def test_add_image_rejects_non_image_content(db_session, tmp_path):
    game_id = _make_game(db_session)
    service = GameImageService(db_session, LocalDiskStorage(str(tmp_path)))

    with pytest.raises(InvalidImageError):
        service.add_image(game_id, "screenshot", b"not an image")


def test_add_image_rejects_invalid_kind(db_session, tmp_path):
    game_id = _make_game(db_session)
    service = GameImageService(db_session, LocalDiskStorage(str(tmp_path)))

    with pytest.raises(InvalidImageError):
        service.add_image(game_id, "poster", _png_bytes())


def test_screenshots_get_increasing_display_order(db_session, tmp_path):
    game_id = _make_game(db_session)
    service = GameImageService(db_session, LocalDiskStorage(str(tmp_path)))

    first = service.add_image(game_id, "screenshot", _png_bytes())
    second = service.add_image(game_id, "screenshot", _png_bytes())

    assert first.display_order == 0
    assert second.display_order == 1
