import io

import pytest
from PIL import Image

from app.repositories.game_repository import GameRepository
from app.repositories.library_repository import LibraryRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.system_repository import SystemRepository
from app.repositories.user_repository import UserRepository
from app.services.exceptions import InvalidImageError
from app.services.profile_service import ProfileService
from app.storage.local_disk_storage import LocalDiskStorage


def _png_bytes() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), color="green").save(buffer, format="PNG")
    return buffer.getvalue()


def _make_user(db_session, username="scott"):
    return UserRepository(db_session).create(username=username, email=f"{username}@example.com")


def test_profile_reports_zero_counts_for_a_new_user(db_session, tmp_path):
    user = _make_user(db_session)
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    profile = service.get_profile(user)

    assert profile.username == "scott"
    assert profile.games_owned == 0
    assert profile.systems_owned == 0
    assert profile.average_review_score is None


def test_profile_counts_games_and_distinct_systems(db_session, tmp_path):
    user = _make_user(db_session)
    systems = SystemRepository(db_session)
    nes_id = systems.create("NES", 1985).id
    snes_id = systems.create("SNES", 1991).id
    games = GameRepository(db_session)
    library = LibraryRepository(db_session)
    for title, system_id in [("Mario", nes_id), ("Zelda", nes_id), ("Metroid", snes_id)]:
        game = games.create(title, None, 1990, system_id, "E", user.id)
        library.create(user.id, game.id, "digital", None)
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    profile = service.get_profile(user)

    assert profile.games_owned == 3
    assert profile.systems_owned == 2


def test_average_review_score_ignores_unrated_games(db_session, tmp_path):
    user = _make_user(db_session)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    games = GameRepository(db_session)
    library = LibraryRepository(db_session)
    reviews = ReviewRepository(db_session)
    rated = library.create(user.id, games.create("Mario", None, 1990, system_id, "E", user.id).id, "digital", None)
    library.create(user.id, games.create("Zelda", None, 1990, system_id, "E", user.id).id, "digital", None)
    reviews.upsert(rated.id, {"fun_factor": 10})
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    assert service.average_review_score(user.id) == 5.0


def test_average_review_score_averages_multiple_rated_games(db_session, tmp_path):
    user = _make_user(db_session)
    system_id = SystemRepository(db_session).create("NES", 1985).id
    games = GameRepository(db_session)
    library = LibraryRepository(db_session)
    reviews = ReviewRepository(db_session)
    first = library.create(user.id, games.create("Mario", None, 1990, system_id, "E", user.id).id, "digital", None)
    second = library.create(user.id, games.create("Zelda", None, 1990, system_id, "E", user.id).id, "digital", None)
    reviews.upsert(first.id, {"fun_factor": 10})
    reviews.upsert(second.id, {"fun_factor": 0})
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    assert service.average_review_score(user.id) == 2.5


def test_profile_stats_are_scoped_to_the_requesting_user(db_session, tmp_path):
    owner = _make_user(db_session, "owner")
    other = _make_user(db_session, "other")
    system_id = SystemRepository(db_session).create("NES", 1985).id
    game = GameRepository(db_session).create("Mario", None, 1990, system_id, "E", owner.id)
    LibraryRepository(db_session).create(owner.id, game.id, "digital", None)
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    assert service.get_profile(owner).games_owned == 1
    assert service.get_profile(other).games_owned == 0


def test_update_profile_picture_saves_file_and_stores_key(db_session, tmp_path):
    user = _make_user(db_session)
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    updated = service.update_profile_picture(user, _png_bytes())

    assert updated.profile_picture_storage_key.startswith("profile_pictures/")
    assert (tmp_path / updated.profile_picture_storage_key).exists()


def test_update_profile_picture_rejects_non_image_content(db_session, tmp_path):
    user = _make_user(db_session)
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))

    with pytest.raises(InvalidImageError):
        service.update_profile_picture(user, b"not an image")


def test_update_profile_picture_replaces_the_previous_key(db_session, tmp_path):
    user = _make_user(db_session)
    service = ProfileService(db_session, LocalDiskStorage(str(tmp_path)))
    first_key = service.update_profile_picture(user, _png_bytes()).profile_picture_storage_key

    second_key = service.update_profile_picture(user, _png_bytes()).profile_picture_storage_key

    assert first_key != second_key
    assert user.profile_picture_storage_key == second_key
