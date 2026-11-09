import { Question } from '../types/game';

export interface SaveQuestionPayload {
  question: Omit<Question, 'id'> | Question;
  setId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Fetch all permanently saved questions from the backend
 */
export async function fetchSavedQuestions(filters?: {
  grade?: number;
  lessonId?: string;
  setId?: string;
}): Promise<Question[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.grade) params.append('grade', filters.grade.toString());
    if (filters?.lessonId) params.append('lessonId', filters.lessonId);
    if (filters?.setId) params.append('setId', filters.setId);

    const res = await fetch(`/api/questions?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const json: ApiResponse<Question[]> = await res.json();
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch (error) {
    console.warn('Failed to fetch questions from backend, falling back to local state:', error);
    return [];
  }
}

/**
 * Save a new question permanently to the backend database
 */
export async function saveQuestionToBackend(
  question: Omit<Question, 'id'>,
  setId?: string
): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, setId }),
    });

    const json: ApiResponse<Question> = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.message || 'Không thể lưu câu hỏi lên máy chủ',
      };
    }

    return {
      success: true,
      question: json.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Lỗi mạng khi kết nối tới máy chủ',
    };
  }
}

/**
 * Delete a question permanently from backend database
 */
export async function deleteQuestionFromBackend(questionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/questions/${questionId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return !!json.success;
  } catch {
    return false;
  }
}
