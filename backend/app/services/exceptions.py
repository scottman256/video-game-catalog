class DuplicateFieldError(Exception):
    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field
        self.message = message


class InvalidCredentialsError(Exception):
    pass


class InvalidImageError(Exception):
    pass


class GameNotFoundError(Exception):
    pass
