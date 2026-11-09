export type Grade = 3 | 4 | 5;

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  content: string;
  options: [string, string, string, string] | string[];
  correctAnswer: number; // 0: A, 1: B, 2: C, 3: D
  explanation: string;
  grade: Grade;
  bookId: string;
  lessonId: string;
  topic?: string;
  difficulty: Difficulty;
  points: number;
  customTimeSeconds?: number; // 5-60s
  imageUrl?: string;
  optionImages?: (string | undefined)[];
  notes?: string;
}

export interface QuestionSet {
  id: string;
  title: string;
  grade: Grade;
  bookId: string;
  lessonId: string;
  topic: string;
  description: string;
  defaultTimeSeconds: number; // 5-60
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  grade: Grade;
  bookId: string;
  lessonNumber: number | string;
  title: string;
  topic: string;
  summary?: string;
}

export interface Book {
  id: string;
  name: string;
  isCustom?: boolean;
}

export type GameMode = 'individual' | 'multiplayer' | 'team';

export interface GameSettings {
  mode: GameMode;
  timeMode: 'global' | 'custom';
  globalTimeSeconds: number; // 5-60s
  questionCount: number;
  selectedQuestionIds: string[];
  selectionMode: 'all' | 'count' | 'manual';
  difficultyFilter: 'all' | 'easy' | 'medium' | 'hard';
  topicFilter: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  pointsPerCorrect: number;
  pointsPerWrong: number;
  pointsPerSkip: number;
  enableAudio: boolean;
  enableAnimation: boolean;
  enableConfetti: boolean;
  // Multiplayer configuration
  players: { id: string; name: string }[];
  // Team configuration
  teams: { id: string; name: string; color: string }[];
}

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  answers: Record<string, { selectedOption: number | null; isCorrect: boolean; timeTaken: number }>;
}

export interface TeamScore {
  id: string;
  name: string;
  color: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}

export interface GameHistoryEntry {
  id: string;
  timestamp: string;
  grade: Grade;
  bookName: string;
  lessonTitle: string;
  questionSetTitle: string;
  mode: GameMode;
  totalQuestions: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  playerNameOrWinner: string;
}
