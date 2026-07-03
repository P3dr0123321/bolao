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

export type PredictionParticipant = Pick<
  Participant,
  "id" | "username" | "full_name" | "avatar_url"
>;

export type PredictionWithParticipant = Prediction & {
  participant: PredictionParticipant;
};

export type FinalPredictionSettings = {
  id: boolean;
  is_enabled: boolean;
  prediction_deadline_at: string | null;
  visibility_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FinalPrediction = {
  id: string;
  participant_id: string;
  finalist_one: string;
  finalist_two: string;
  winner: string;
  created_at: string;
  updated_at: string;
};

export type FinalPredictionWithParticipant = FinalPrediction & {
  participant: PredictionParticipant;
};

export type FinalPredictionState = {
  settings: FinalPredictionSettings | null;
  prediction: FinalPrediction | null;
  isEnabled: boolean;
  canSubmit: boolean;
  canViewAll: boolean;
  predictionDeadlinePassed: boolean;
  visibilityPassed: boolean;
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
