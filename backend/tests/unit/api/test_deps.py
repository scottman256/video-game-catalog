from app.api.deps import get_storage
from app.core.config import get_settings


def test_default_storage_serves_uploads_from_the_public_base_url():
    url = get_storage().url_for("box_art/cover.png")

    assert url == f"{get_settings().public_base_url}/uploads/box_art/cover.png"
