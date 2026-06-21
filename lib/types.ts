export interface Word {
  id: number;
  japanese: string;
  korean: string;
  reading: string;
  category: string;
  skip_until_round: number;
  total_correct: number;
  total_attempts: number;
  created_at: string;
}

export interface QuizSession {
  id: number;
  round_number: number;
  total_questions: number;
  correct_count: number;
  user_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface QuizAnswer {
  id: number;
  session_id: number;
  word_id: number;
  user_answer: string;
  is_correct: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface UserState {
  user_id: number;
  current_round: number;
  cycle_seen_ids: string;
  updated_at: string;
}

export interface UserWordStat {
  user_id: number;
  word_id: number;
  skip_until_round: number;
  total_correct: number;
  total_attempts: number;
}
