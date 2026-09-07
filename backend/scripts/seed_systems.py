from app.db.session import SessionLocal
from app.repositories.system_repository import SystemRepository

# North American release years; sourced against Wikipedia's console release
# timelines. Starts at the NES (1985) per product requirements.
SYSTEMS: list[tuple[str, int]] = [
    ("Nintendo Entertainment System", 1985),
    ("Sega Master System", 1986),
    ("Atari 7800", 1986),
    ("Atari Lynx", 1989),
    ("TurboGrafx-16", 1989),
    ("Sega Genesis", 1989),
    ("Game Boy", 1989),
    ("Neo Geo", 1990),
    ("Sega Game Gear", 1991),
    ("Super Nintendo Entertainment System", 1991),
    ("Sega CD", 1992),
    ("3DO Interactive Multiplayer", 1993),
    ("Atari Jaguar", 1993),
    ("Sega 32X", 1994),
    ("Sega Saturn", 1995),
    ("PlayStation", 1995),
    ("Nintendo 64", 1996),
    ("Game Boy Color", 1998),
    ("Sega Dreamcast", 1999),
    ("PlayStation 2", 2000),
    ("Nintendo GameCube", 2001),
    ("Xbox", 2001),
    ("Game Boy Advance", 2001),
    ("Nintendo DS", 2004),
    ("PlayStation Portable", 2004),
    ("Xbox 360", 2005),
    ("Nintendo Wii", 2006),
    ("PlayStation 3", 2006),
    ("Nintendo 3DS", 2011),
    ("PlayStation Vita", 2012),
    ("Wii U", 2012),
    ("PlayStation 4", 2013),
    ("Xbox One", 2013),
    ("Nintendo Switch", 2017),
    ("Xbox Series X/S", 2020),
    ("PlayStation 5", 2020),
    ("Valve Steam Deck", 2022),
    ("Nintendo Switch 2", 2025),
]


def seed_systems() -> None:
    db = SessionLocal()
    try:
        repo = SystemRepository(db)
        for name, release_year in SYSTEMS:
            if not repo.name_exists(name):
                repo.create(name, release_year)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed_systems()
