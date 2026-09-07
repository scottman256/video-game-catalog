import io

from PIL import Image, UnidentifiedImageError

from app.services.exceptions import InvalidImageError

ALLOWED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_and_get_extension(content: bytes) -> str:
    if len(content) > MAX_IMAGE_BYTES:
        raise InvalidImageError("Image exceeds the 5 MB size limit")
    image_format = _sniff_format(content)
    if image_format not in ALLOWED_FORMATS:
        raise InvalidImageError("Image must be JPEG, PNG, or WebP")
    return ALLOWED_FORMATS[image_format]


def _sniff_format(content: bytes) -> str | None:
    try:
        return Image.open(io.BytesIO(content)).format
    except (UnidentifiedImageError, OSError):
        return None
