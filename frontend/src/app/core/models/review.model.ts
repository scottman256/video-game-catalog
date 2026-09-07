export interface Review {
  graphics_performance: number | null;
  music_sound: number | null;
  controls_playability: number | null;
  content_length: number | null;
  fun_factor: number | null;
  weighted_score: number | null;
}

export type ReviewUpsertPayload = Omit<Review, 'weighted_score'>;
