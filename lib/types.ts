export type ParticipantRole = "participant" | "admin";
export type MatchStatus = "scheduled" | "live" | "finished";

export type Participant = {
  id: string;
  auth_user_id: string | null;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: ParticipantRole;
  total_points: number;
  created_at: string;
};

export type Match = {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  starts_at: string;
  status: MatchStatus;
  round: string | null;
  group_name: string | null;
  created_at: string;
};

export type Prediction = {
  id: string;
  participant_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number;
  created_at: string;
  updated_at: string;
};

export type FamilyPhoto = {
  id: string;
  image_url: string;
  title: string | null;
  sort_order: number;
  created_at: string;
};

export type MatchWithPrediction = Match & {
  predictions: Prediction[];
};

export type ActionState = {
  ok: boolean;
  message: string;
};
