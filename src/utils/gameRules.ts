import { Difficulty, GameSettings, PlayerScore, Question, QuestionSet } from '../types/game';

/**
 * Clamps time to allowed bounds: 1 to 60 seconds (with 60 being absolute max)
 */
export function clampTimeSeconds(time: number, defaultTime: number = 20): number {
  if (typeof time !== 'number' || isNaN(time)) return defaultTime;
  return Math.max(1, Math.min(60, Math.round(time)));
}

/**
 * Pure Fisher-Yates array shuffle that does not mutate original array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles the 4 options of a question while preserving which one is the correct answer
 */
export function shuffleQuestionOptions(question: Question): Question {
  const originalOptions = question.options;
  const originalImages = question.optionImages;
  
  // Pair options with original index and image
  const optionEntries = originalOptions.map((opt, idx) => ({
    text: opt,
    image: originalImages ? originalImages[idx] : undefined,
    isCorrect: idx === question.correctAnswer,
  }));
  const shuffled = shuffleArray(optionEntries);
  
  const newOptions = shuffled.map(item => item.text);
  const newImages = originalImages ? shuffled.map(item => item.image) : undefined;
  const newCorrectIndex = shuffled.findIndex(item => item.isCorrect);

  return {
    ...question,
    options: newOptions,
    optionImages: newImages,
    correctAnswer: newCorrectIndex !== -1 ? newCorrectIndex : 0,
  };
}

/**
 * Filters, selects and prepares questions based on game settings
 */
export function filterAndPrepareQuestions(
  questionSet: QuestionSet,
  settings: GameSettings
): Question[] {
  if (!questionSet || !questionSet.questions) return [];
  
  let pool = [...questionSet.questions];

  // 1. Filter by manual selection if mode is manual
  if (settings.selectionMode === 'manual' && settings.selectedQuestionIds.length > 0) {
    pool = pool.filter(q => settings.selectedQuestionIds.includes(q.id));
  } else {
    // Filter by topic if specified
    if (settings.topicFilter && settings.topicFilter !== 'all') {
      pool = pool.filter(q => q.topic === settings.topicFilter);
    }

    // Filter by difficulty if specified
    if (settings.difficultyFilter && settings.difficultyFilter !== 'all') {
      pool = pool.filter(q => q.difficulty === settings.difficultyFilter);
    }
  }

  // 2. Shuffle questions if requested
  if (settings.shuffleQuestions) {
    pool = shuffleArray(pool);
  }

  // 3. Limit count
  let targetCount = pool.length;
  if (settings.selectionMode === 'count' && settings.questionCount > 0) {
    targetCount = Math.min(pool.length, Math.max(1, settings.questionCount));
  }
  pool = pool.slice(0, targetCount);

  // 4. Shuffle options if requested and apply custom time/points
  return pool.map(q => {
    let prepared = { ...q };

    // Apply time rule
    if (settings.timeMode === 'global') {
      prepared.customTimeSeconds = clampTimeSeconds(settings.globalTimeSeconds, 20);
    } else {
      // per-question custom time, falls back to questionSet.defaultTimeSeconds or global
      prepared.customTimeSeconds = clampTimeSeconds(
        q.customTimeSeconds ?? questionSet.defaultTimeSeconds ?? settings.globalTimeSeconds,
        20
      );
    }

    // Shuffle options
    if (settings.shuffleOptions) {
      prepared = shuffleQuestionOptions(prepared);
    }

    return prepared;
  });
}

/**
 * Evaluates performance title and supportive message based on actual results
 */
export function calculateRankAndTitle(correctCount: number, totalQuestions: number): {
  title: string;
  badgeColor: string;
  message: string;
  stars: number;
} {
  if (totalQuestions <= 0) {
    return {
      title: 'NGÔI SAO ĐANG TỎA SÁNG',
      badgeColor: 'text-amber-500 bg-amber-50 border-amber-300',
      message: 'Hãy thử sức thêm nhiều câu hỏi để nâng cao kiến thức nhé!',
      stars: 1,
    };
  }

  const accuracy = (correctCount / totalQuestions) * 100;

  if (accuracy === 100) {
    return {
      title: 'SIÊU SAO TIN HỌC',
      badgeColor: 'text-yellow-600 bg-yellow-50 border-yellow-400',
      message: 'Xuất sắc tuyệt đối! Em xứng đáng là Quán quân Rung Chuông Vàng!',
      stars: 5,
    };
  } else if (accuracy >= 80) {
    return {
      title: 'CAO THỦ MÁY TÍNH',
      badgeColor: 'text-emerald-600 bg-emerald-50 border-emerald-400',
      message: 'Thành tích rất ấn tượng! Em nắm rất vững kiến thức Tin học!',
      stars: 4,
    };
  } else if (accuracy >= 60) {
    return {
      title: 'NHÀ KHÁM PHÁ CÔNG NGHỆ',
      badgeColor: 'text-blue-600 bg-blue-50 border-blue-400',
      message: 'Làm tốt lắm! Em đang tiến bộ rất nhanh trên con đường công nghệ!',
      stars: 3,
    };
  } else if (accuracy >= 40) {
    return {
      title: 'CHIẾN BINH TRI THỨC',
      badgeColor: 'text-indigo-600 bg-indigo-50 border-indigo-400',
      message: 'Cố gắng rất tốt! Ôn luyện thêm một chút là em sẽ đạt điểm tối đa!',
      stars: 2,
    };
  } else {
    return {
      title: 'NGÔI SAO ĐANG TỎA SÁNG',
      badgeColor: 'text-orange-600 bg-orange-50 border-orange-400',
      message: 'Đừng nản lòng nhé! Mỗi câu hỏi là một bài học bổ ích cho em!',
      stars: 1,
    };
  }
}

/**
 * Sorts multiplayer players by score descending, then correct count descending, then name
 */
export function sortLeaderboard(players: PlayerScore[]): PlayerScore[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.name.localeCompare(b.name, 'vi');
  });
}

/**
 * Validates a single question object
 */
export function validateQuestion(q: any): { isValid: boolean; error?: string } {
  if (!q || typeof q !== 'object') {
    return { isValid: false, error: 'Dữ liệu câu hỏi không hợp lệ (không phải đối tượng)' };
  }
  if (!q.content || typeof q.content !== 'string' || !q.content.trim()) {
    return { isValid: false, error: 'Câu hỏi chưa có nội dung' };
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return { isValid: false, error: 'Câu hỏi phải có đúng 4 phương án lựa chọn (A, B, C, D)' };
  }
  for (let i = 0; i < 4; i++) {
    if (!q.options[i] || typeof q.options[i] !== 'string' || !q.options[i].trim()) {
      return { isValid: false, error: `Phương án ${String.fromCharCode(65 + i)} bị trống` };
    }
  }
  if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
    return { isValid: false, error: 'Đáp án đúng phải là 0 (A), 1 (B), 2 (C) hoặc 3 (D)' };
  }
  if (q.customTimeSeconds !== undefined && (q.customTimeSeconds < 1 || q.customTimeSeconds > 60)) {
    return { isValid: false, error: 'Thời gian câu hỏi phải từ 1 đến 60 giây' };
  }
  return { isValid: true };
}

/**
 * Validates an imported QuestionSet JSON
 */
export function validateQuestionSetJSON(data: any): { isValid: boolean; error?: string; questionSet?: QuestionSet } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Tệp không phải là định dạng JSON hợp lệ' };
  }
  if (!data.title || typeof data.title !== 'string') {
    return { isValid: false, error: 'Bộ câu hỏi thiếu tiêu đề (title)' };
  }
  if (![3, 4, 5].includes(Number(data.grade))) {
    return { isValid: false, error: 'Khối lớp không hợp lệ (phải là 3, 4 hoặc 5)' };
  }
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    return { isValid: false, error: 'Bộ câu hỏi phải có ít nhất 1 câu hỏi' };
  }

  for (let idx = 0; idx < data.questions.length; idx++) {
    const q = data.questions[idx];
    const validation = validateQuestion(q);
    if (!validation.isValid) {
      return { isValid: false, error: `Câu số ${idx + 1} lỗi: ${validation.error}` };
    }
  }

  return { isValid: true, questionSet: data as QuestionSet };
}
