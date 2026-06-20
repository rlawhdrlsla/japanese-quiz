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

export interface QuizWord extends Word {
  userAnswer?: string;
  isCorrect?: boolean | null;
}

export interface StatsData {
  totalWords: number;
  totalSessions: number;
  overallAccuracy: number;
  weakWords: Word[];
  strongWords: Word[];
  recentSessions: (QuizSession & { words: string[] })[];
  categoryStats: { category: string; count: number; accuracy: number }[];
}
