import io

import pytest
from PIL import Image

from app.repositories.game_image_repository import GameImageRepository
from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import GameNotFoundError
from app.services.game_deletion_service import GameDeletionService
from app.services.game_image_service import GameImageService
from app.storage.local_disk_storage import LocalDiskStorage


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="red").save(buffer, format="PNG")
    return buffer.getvalue()


def _make_owned_and_reviewed_game(db_session, title: str, owner_ids: list[int], system_id: int) -> int:
    game_id = GameRepository(db_session).create(title, None, 1985, system_id, "E", owner_ids[0]).id
    for owner_id in owner_ids:
        entry = LibraryRepository(db_session).create(owner_id, game_id, "digital", None)
        ReviewRepository(db_session).upsert(entry.id, {"fun_factor": 8})
    return game_id


@pytest.fixture
def catalog(db_session, tmp_path):
    """Two games owned and reviewed by two players; the first one has images on disk."""
    system_id = SystemRepository(db_session).create("NES", 1985).id
    users = UserRepository(db_session)
    owner_ids = [users.create(username=name, email=f"{name}@example.com").id for name in ("alice", "bob")]
    doomed_id = _make_owned_and_reviewed_game(db_session, "Doomed", owner_ids, system_id)
    kept_id = _make_owned_and_reviewed_game(db_session, "Kept", owner_ids, system_id)
    storage = LocalDiskStorage(str(tmp_path))
    images = GameImageService(db_session, storage)
    image_keys = [images.add_image(doomed_id, kind, _png_bytes()).storage_key for kind in ("box_art", "screenshot")]
    return {"doomed_id": doomed_id, "kept_id": kept_id, "owner_ids": owner_ids, "storage": storage, "image_keys": image_keys}


def test_delete_game_removes_the_game(db_session, catalog):
    GameDeletionService(db_session, catalog["storage"]).delete_game(catalog["doomed_id"])

    assert GameRepository(db_session).get_by_id(catalog["doomed_id"]) is None


def test_delete_game_removes_it_from_every_library_along_with_reviews(db_session, catalog):
    GameDeletionService(db_session, catalog["storage"]).delete_game(catalog["doomed_id"])

    library = LibraryRepository(db_session)
    assert all(library.list_game_ids_for_user(owner_id) == {catalog["kept_id"]} for owner_id in catalog["owner_ids"])
    assert ReviewRepository(db_session).list_for_game(catalog["doomed_id"]) == []


def test_delete_game_removes_image_records_and_files(db_session, catalog, tmp_path):
    GameDeletionService(db_session, catalog["storage"]).delete_game(catalog["doomed_id"])

    assert GameImageRepository(db_session).list_for_game(catalog["doomed_id"]) == []
    assert not any((tmp_path / key).exists() for key in catalog["image_keys"])


def test_delete_game_leaves_other_games_untouched(db_session, catalog):
    GameDeletionService(db_session, catalog["storage"]).delete_game(catalog["doomed_id"])

    assert GameRepository(db_session).get_by_id(catalog["kept_id"]) is not None
    assert len(ReviewRepository(db_session).list_for_game(catalog["kept_id"])) == 2


def test_delete_game_raises_when_missing(db_session, tmp_path):
    with pytest.raises(GameNotFoundError):
        GameDeletionService(db_session, LocalDiskStorage(str(tmp_path))).delete_game(999)
