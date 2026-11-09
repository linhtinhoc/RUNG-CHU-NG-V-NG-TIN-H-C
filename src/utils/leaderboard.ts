import { Grade } from '../types/game';

export interface FunBadge {
  id: string;
  icon: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

export interface GlobalLeaderboardEntry {
  id: string;
  lastName: string;       // "Họ và " (Họ và tên đệm)
  firstName: string;      // "Tên học sinh"
  fullName: string;       // Họ và tên đầy đủ
  studentClass: string;   // Lớp (ví dụ: 3A, 4B, 5C)
  timestamp: string;      // "Thời gian" (ví dụ: "09/11/2026 13:05")
  createdAt: number;      // Epoch ms for sorting
  correctDetails: string; // "Câu trả lời đúng" (danh sách câu đúng, ví dụ: "1, 2, 4, 5")
  wrongDetails: string;   // "Câu trả lời sai" (danh sách câu sai, ví dụ: "3")
  correctCount: number;   // "Tổng số câu trả lời đúng"
  wrongCount: number;     // "Tổng số câu trả lời sai"
  totalQuestions: number; // Tổng số câu hỏi
  score: number;          // "Điểm"
  accuracy: number;       // Tỉ lệ % đúng (0-100)
  timeTakenSeconds?: number; // Thời gian làm bài tính theo giây
  grade?: Grade | number; // Khối lớp
  lessonTitle?: string;   // Tên bài học
  questionSetTitle?: string; // Tên bộ đề
  badge?: FunBadge;       // Huy hiệu vui nhộn
}

/**
 * Splits Vietnamese full name into "Họ và " (last & middle names) and "Tên học sinh" (first name),
 * while extracting class info if formatted like "Nguyễn Văn An - 3A" or "Nguyễn Văn An (4B)".
 */
export function parseVietnameseName(
  rawInput: string,
  fallbackClass: string = ''
): { lastName: string; firstName: string; fullName: string; studentClass: string } {
  if (!rawInput || !rawInput.trim()) {
    return {
      lastName: '',
      firstName: 'Học sinh',
      fullName: 'Học sinh',
      studentClass: fallbackClass.trim() || 'Chung',
    };
  }

  let text = rawInput.trim();
  let extractedClass = fallbackClass.trim();

  // Pattern 1: "Nguyễn Văn An - 3A" or "Nguyễn Văn An / 3A"
  const dashMatch = text.match(/^(.*?)\s*[-/–]\s*([1-5][A-Za-z0-9]*)\s*$/);
  if (dashMatch) {
    text = dashMatch[1].trim();
    if (!extractedClass) extractedClass = dashMatch[2].trim().toUpperCase();
  }

  // Pattern 2: "Nguyễn Văn An (Lớp 4B)" or "(4B)"
  const parenMatch = text.match(/^(.*?)\s*\((?:Lớp\s*)?([1-5][A-Za-z0-9]*)\)\s*$/i);
  if (parenMatch) {
    text = parenMatch[1].trim();
    if (!extractedClass) extractedClass = parenMatch[2].trim().toUpperCase();
  }

  // Pattern 3: "Nguyễn Văn An 3A" (class at end)
  const trailingClassMatch = text.match(/^(.*?)\s+([1-5][A-Za-z0-9]{1,3})$/);
  if (trailingClassMatch && !dashMatch && !parenMatch) {
    // Only if first part has words
    const candidateName = trailingClassMatch[1].trim();
    if (candidateName.length > 2) {
      text = candidateName;
      if (!extractedClass) extractedClass = trailingClassMatch[2].trim().toUpperCase();
    }
  }

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      lastName: '',
      firstName: 'Học sinh',
      fullName: 'Học sinh',
      studentClass: extractedClass || 'Chung',
    };
  }

  if (parts.length === 1) {
    return {
      lastName: '',
      firstName: parts[0],
      fullName: parts[0],
      studentClass: extractedClass || 'Chung',
    };
  }

  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, -1).join(' ');

  return {
    lastName,
    firstName,
    fullName: `${lastName} ${firstName}`,
    studentClass: extractedClass || 'Chung',
  };
}

/**
 * Assigns a fun gamification badge based on performance, speed, and accuracy
 */
export function assignFunBadge(params: {
  correctCount: number;
  totalQuestions: number;
  score: number;
  accuracy: number;
  timeTakenSeconds?: number;
}): FunBadge {
  const { correctCount, totalQuestions, accuracy, timeTakenSeconds } = params;

  // 1. Quán quân Rung Chuông Vàng: 100% correct
  if (totalQuestions > 0 && correctCount === totalQuestions) {
    return {
      id: 'golden_bell_champion',
      icon: '🔔',
      label: 'Quán Quân Chuông Vàng',
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-950/50',
      borderColor: 'border-amber-400',
      description: 'Xuất sắc đạt điểm tuyệt đối 100% tất cả các câu hỏi!',
    };
  }

  // 2. Tia chớp Tin học: Fast completion with high accuracy (>= 80%)
  const isLightningFast =
    timeTakenSeconds !== undefined &&
    timeTakenSeconds > 0 &&
    totalQuestions > 0 &&
    timeTakenSeconds / totalQuestions <= 6; // Average under 6 seconds per question

  if (isLightningFast && accuracy >= 80) {
    return {
      id: 'lightning_speed',
      icon: '⚡',
      label: 'Tia Chớp Tin Học',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-950/50',
      borderColor: 'border-blue-400',
      description: 'Tốc độ phản xạ cực nhanh với độ chính xác tuyệt vời!',
    };
  }

  // 3. Chiến Binh Xuất Sắc: accuracy >= 90%
  if (accuracy >= 90) {
    return {
      id: 'elite_warrior',
      icon: '🌟',
      label: 'Chiến Binh Xuất Sắc',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950/50',
      borderColor: 'border-purple-400',
      description: 'Đạt thành tích vượt trội trên 90% số câu hỏi!',
    };
  }

  // 4. Bậc Thầy Thuật Toán: accuracy >= 80%
  if (accuracy >= 80) {
    return {
      id: 'algorithm_master',
      icon: '🏆',
      label: 'Bậc Thầy Thuật Toán',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      borderColor: 'border-emerald-400',
      description: 'Nắm vững kiến thức bài học và tư duy logic rất tốt!',
    };
  }

  // 5. Sao Sáng Công Nghệ: accuracy >= 70%
  if (accuracy >= 70) {
    return {
      id: 'tech_star',
      icon: '💡',
      label: 'Sao Sáng Công Nghệ',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-950/50',
      borderColor: 'border-cyan-400',
      description: 'Hiểu bài tốt và có niềm say mê công nghệ!',
    };
  }

  // 6. Thiện Xạ Bấm Phím: accuracy >= 50%
  if (accuracy >= 50) {
    return {
      id: 'key_sharpshooter',
      icon: '🎯',
      label: 'Thiện Xạ Bấm Phím',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100 dark:bg-orange-950/50',
      borderColor: 'border-orange-400',
      description: 'Nỗ lực thi đấu và hoàn thành tốt phần lớn thử thách!',
    };
  }

  // 7. Ong Vàng Chăm Chỉ: Completed test
  return {
    id: 'busy_bee',
    icon: '🐝',
    label: 'Ong Vàng Chăm Chỉ',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-950/50',
    borderColor: 'border-teal-400',
    description: 'Chăm chỉ hoàn thành bài thi, kiên trì học hỏi môn Tin học!',
  };
}

/**
 * Formats a timestamp into Vietnamese local string "DD/MM/YYYY HH:mm"
 */
export function formatVietnameseTimestamp(timestampMs?: number | string): string {
  const date = timestampMs ? new Date(timestampMs) : new Date();
  if (isNaN(date.getTime())) return '';

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const LOCAL_STORAGE_KEY = 'rung_chuong_vang_global_leaderboard_v1';

/**
 * Loads saved global leaderboard from localStorage
 */
export function getLocalLeaderboard(): GlobalLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Saves global leaderboard entries to localStorage
 */
export function saveLocalLeaderboard(entries: GlobalLeaderboardEntry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries.slice(0, 500))); // keep top 500
  } catch (e) {
    console.warn('Failed to save global leaderboard to localStorage:', e);
  }
}

/**
 * Adds an entry to local storage and returns updated list
 */
export function addEntryToLocalLeaderboard(entry: GlobalLeaderboardEntry): GlobalLeaderboardEntry[] {
  const current = getLocalLeaderboard();
  // Check if identical id or duplicate
  const filtered = current.filter(e => e.id !== entry.id);
  const updated = [entry, ...filtered];
  saveLocalLeaderboard(updated);
  return updated;
}
