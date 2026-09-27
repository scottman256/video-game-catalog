"""Creates an admin account, or promotes an existing account to admin.

Usage: python -m scripts.create_admin <username> <email> <password>

The password strength rules enforced at registration are deliberately not applied here,
so choose a strong password for any environment other than local development.
An existing account keeps its current password.
"""

import sys

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User
from app.repositories.credential_repository import CredentialRepository
from app.repositories.user_repository import UserRepository


def create_admin(db: Session, username: str, email: str, password: str) -> User:
    users = UserRepository(db)
    user = users.get_by_username_or_email(username) or _create_user(db, username, email, password)
    return users.set_admin(user, True)


def _create_user(db: Session, username: str, email: str, password: str) -> User:
    user = UserRepository(db).create(username=username, email=email)
    CredentialRepository(db).create(user.id, hash_password(password))
    return user


def main(arguments: list[str]) -> None:
    if len(arguments) != 3:
        sys.exit(__doc__)
    db = SessionLocal()
    try:
        admin = create_admin(db, *arguments)
        db.commit()
        print(f"{admin.username} (id {admin.id}) is an admin")
    finally:
        db.close()


if __name__ == "__main__":
    main(sys.argv[1:])
