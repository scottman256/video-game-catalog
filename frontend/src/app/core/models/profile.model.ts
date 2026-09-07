export interface Profile {
  username: string;
  email: string;
  created_at: string;
  profile_picture_url: string | null;
  games_owned: number;
  systems_owned: number;
  average_review_score: number | null;
}
