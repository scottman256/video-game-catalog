from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import admin, auth, game_images, games, library, profile, reviews, systems, user_settings, wishlist
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Video Game Catalog API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(systems.router)
app.include_router(games.router)
app.include_router(game_images.router)
app.include_router(library.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)
app.include_router(user_settings.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
