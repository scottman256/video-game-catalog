from app.models.user_game_review import UserGameReview
from app.services.review_service import compute_weighted_score


def test_fully_rated_review_computes_weighted_average():
    review = UserGameReview(
        graphics_performance=10, music_sound=10, controls_playability=10, content_length=10, fun_factor=10
    )

    assert compute_weighted_score(review) == 5.0


def test_unrated_review_returns_none():
    assert compute_weighted_score(UserGameReview()) is None


def test_none_review_returns_none():
    assert compute_weighted_score(None) is None


def test_single_category_rated_renormalizes_to_full_weight():
    review = UserGameReview(fun_factor=10)

    assert compute_weighted_score(review) == 5.0


def test_two_categories_rated_renormalizes_across_them():
    review = UserGameReview(fun_factor=10, graphics_performance=0)

    assert compute_weighted_score(review) == 2.78
