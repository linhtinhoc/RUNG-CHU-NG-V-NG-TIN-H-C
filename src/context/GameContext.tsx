import React, { createContext, useContext, useState, useEffect } from 'react';
import { Book, Difficulty, GameHistoryEntry, Grade, Lesson, Question, QuestionSet } from '../types/game';
import { DEFAULT_BOOKS, DEFAULT_LESSONS, DEFAULT_QUESTION_SETS } from '../data/defaultData';
import { validateQuestionSetJSON } from '../utils/gameRules';
import { saveQuestionToBackend, deleteQuestionFromBackend, fetchSavedQuestions } from '../services/questionsApi';

const STORAGE_KEY_BOOKS = 'rcv_books_v1';
const STORAGE_KEY_LESSONS = 'rcv_lessons_v1';
const STORAGE_KEY_SETS = 'rcv_question_sets_v1';
const STORAGE_KEY_HISTORY = 'rcv_game_history_v1';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface GameContextType {
  books: Book[];
  lessons: Lesson[];
  questionSets: QuestionSet[];
  activeGrade: Grade;
  activeBookId: string;
  activeLessonId: string;
  activeQuestionSetId: string;
  gameHistory: GameHistoryEntry[];
  toasts: ToastMessage[];
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  setActiveGrade: (grade: Grade) => void;
  setActiveBookId: (bookId: string) => void;
  setActiveLessonId: (lessonId: string) => void;
  setActiveQuestionSetId: (setId: string) => void;
  // CRUD Question Sets
  createQuestionSet: (setData: Partial<QuestionSet>) => QuestionSet;
  updateQuestionSet: (id: string, setData: Partial<QuestionSet>) => void;
  deleteQuestionSet: (id: string) => boolean;
  duplicateQuestionSet: (id: string) => QuestionSet | null;
  // CRUD Questions
  addQuestionToSet: (setId: string, question: Omit<Question, 'id'>) => Question;
  updateQuestionInSet: (setId: string, questionId: string, updated: Partial<Question>) => void;
  deleteQuestionFromSet: (setId: string, questionId: string) => void;
  duplicateQuestionInSet: (setId: string, questionId: string) => void;
  // CRUD Lessons
  createLesson: (lessonData: Omit<Lesson, 'id'>) => Lesson;
  updateLesson: (id: string, lessonData: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  // Books
  createBook: (name: string) => Book;
  // Import / Export
  exportQuestionSetAsJSON: (setId: string) => void;
  exportAllDataAsJSON: () => void;
  importQuestionSetFromJSON: (jsonString: string) => { success: boolean; message: string };
  importAllDataFromJSON: (jsonString: string) => { success: boolean; message: string };
  resetToDefaultData: () => void;
  // Game History
  saveGameHistory: (entry: Omit<GameHistoryEntry, 'id' | 'timestamp'>) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BOOKS);
      return saved ? JSON.parse(saved) : DEFAULT_BOOKS;
    } catch {
      return DEFAULT_BOOKS;
    }
  });

  const [lessons, setLessons] = useState<Lesson[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LESSONS);
      return saved ? JSON.parse(saved) : DEFAULT_LESSONS;
    } catch {
      return DEFAULT_LESSONS;
    }
  });

  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETS);
      return saved ? JSON.parse(saved) : DEFAULT_QUESTION_SETS;
    } catch {
      return DEFAULT_QUESTION_SETS;
    }
  });

  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeGrade, setActiveGrade] = useState<Grade>(3);
  const [activeBookId, setActiveBookId] = useState<string>('kn-tri-thuc');
  const [activeLessonId, setActiveLessonId] = useState<string>('l3-b3');
  const [activeQuestionSetId, setActiveQuestionSetId] = useState<string>('set-l3-b3-1');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auto-save whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BOOKS, JSON.stringify(books));
    } catch (e) {
      console.error('Failed to save books:', e);
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(lessons));
    } catch (e) {
      console.error('Failed to save lessons:', e);
    }
  }, [lessons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETS, JSON.stringify(questionSets));
    } catch (e) {
      console.error('Failed to save question sets:', e);
    }
  }, [questionSets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(gameHistory));
    } catch (e) {
      console.error('Failed to save game history:', e);
    }
  }, [gameHistory]);

  // Reconcile permanently saved questions from backend on initial mount
  useEffect(() => {
    fetchSavedQuestions()
      .then(remoteQuestions => {
        if (remoteQuestions && remoteQuestions.length > 0) {
          setQuestionSets(prev => {
            return prev.map(s => {
              const extra = remoteQuestions.filter((q: any) => q.setId === s.id);
              if (extra.length === 0) return s;
              const existingIds = new Set(s.questions.map(q => q.id));
              const newQuestions = extra.filter(q => !existingIds.has(q.id));
              if (newQuestions.length === 0) return s;
              return {
                ...s,
                questions: [...s.questions, ...newQuestions],
              };
            });
          });
        }
      })
      .catch(() => {});
  }, []);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Keep active lesson & question set valid when grade or book changes
  useEffect(() => {
    const validLessons = lessons.filter(l => l.grade === activeGrade && l.bookId === activeBookId);
    if (validLessons.length > 0) {
      const currentStillValid = validLessons.some(l => l.id === activeLessonId);
      if (!currentStillValid) {
        setActiveLessonId(validLessons[0].id);
      }
    } else {
      setActiveLessonId('');
    }
  }, [activeGrade, activeBookId, lessons]);

  useEffect(() => {
    if (!activeLessonId) {
      setActiveQuestionSetId('');
      return;
    }
    const matchingSets = questionSets.filter(s => s.lessonId === activeLessonId);
    if (matchingSets.length > 0) {
      const currentStillValid = matchingSets.some(s => s.id === activeQuestionSetId);
      if (!currentStillValid) {
        setActiveQuestionSetId(matchingSets[0].id);
      }
    } else {
      setActiveQuestionSetId('');
    }
  }, [activeLessonId, questionSets]);

  // CRUD Question Sets
  const createQuestionSet = (setData: Partial<QuestionSet>): QuestionSet => {
    const newId = `set-${Date.now()}`;
    const newSet: QuestionSet = {
      id: newId,
      title: setData.title || 'Bộ câu hỏi mới',
      grade: setData.grade || activeGrade,
      bookId: setData.bookId || activeBookId,
      lessonId: setData.lessonId || activeLessonId,
      topic: setData.topic || 'Tin học',
      description: setData.description || '',
      defaultTimeSeconds: setData.defaultTimeSeconds || 20,
      questions: setData.questions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQuestionSets(prev => [newSet, ...prev]);
    setActiveQuestionSetId(newId);
    addToast(`Đã tạo bộ câu hỏi: "${newSet.title}"`, 'success');
    return newSet;
  };

  const updateQuestionSet = (id: string, setData: Partial<QuestionSet>) => {
    setQuestionSets(prev =>
      prev.map(s => (s.id === id ? { ...s, ...setData, updatedAt: new Date().toISOString() } : s))
    );
    addToast('Đã lưu các thay đổi của bộ câu hỏi!', 'success');
  };

  const deleteQuestionSet = (id: string): boolean => {
    const set = questionSets.find(s => s.id === id);
    if (!set) return false;

    setQuestionSets(prev => prev.filter(s => s.id !== id));
    addToast(`Đã xóa bộ câu hỏi: "${set.title}"`, 'info');
    return true;
  };

  const duplicateQuestionSet = (id: string): QuestionSet | null => {
    const target = questionSets.find(s => s.id === id);
    if (!target) return null;

    const newId = `set-${Date.now()}`;
    const copy: QuestionSet = {
      ...target,
      id: newId,
      title: `${target.title} (Bản sao)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      questions: target.questions.map(q => ({
        ...q,
        id: `q-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      })),
    };

    setQuestionSets(prev => [copy, ...prev]);
    setActiveQuestionSetId(newId);
    addToast(`Đã nhân bản bộ câu hỏi thành "${copy.title}"`, 'success');
    return copy;
  };

  // CRUD Questions
  const addQuestionToSet = (setId: string, question: Omit<Question, 'id'>): Question => {
    const newQ: Question = {
      ...question,
      id: `q-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
    };

    setQuestionSets(prev =>
      prev.map(s => {
        if (s.id === setId) {
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            questions: [...s.questions, newQ],
          };
        }
        return s;
      })
    );

    // Save permanently to backend database
    saveQuestionToBackend(newQ, setId).then(res => {
      if (res.success) {
        addToast('Đã lưu câu hỏi vĩnh viễn vào hệ thống!', 'success');
      }
    }).catch(() => {});

    addToast('Đã thêm câu hỏi mới thành công!', 'success');
    return newQ;
  };

  const updateQuestionInSet = (setId: string, questionId: string, updated: Partial<Question>) => {
    setQuestionSets(prev =>
      prev.map(s => {
        if (s.id === setId) {
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            questions: s.questions.map(q => (q.id === questionId ? { ...q, ...updated } : q)),
          };
        }
        return s;
      })
    );
    addToast('Đã cập nhật câu hỏi thành công!', 'success');
  };

  const deleteQuestionFromSet = (setId: string, questionId: string) => {
    setQuestionSets(prev =>
      prev.map(s => {
        if (s.id === setId) {
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            questions: s.questions.filter(q => q.id !== questionId),
          };
        }
        return s;
      })
    );

    deleteQuestionFromBackend(questionId).catch(() => {});
    addToast('Đã xóa câu hỏi khỏi bộ!', 'info');
  };

  const duplicateQuestionInSet = (setId: string, questionId: string) => {
    setQuestionSets(prev =>
      prev.map(s => {
        if (s.id === setId) {
          const original = s.questions.find(q => q.id === questionId);
          if (!original) return s;
          const copy: Question = {
            ...original,
            id: `q-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
            content: `${original.content} (Bản sao)`,
          };
          return {
            ...s,
            updatedAt: new Date().toISOString(),
            questions: [...s.questions, copy],
          };
        }
        return s;
      })
    );
    addToast('Đã nhân bản câu hỏi!', 'success');
  };

  // Lessons
  const createLesson = (lessonData: Omit<Lesson, 'id'>): Lesson => {
    const newLesson: Lesson = {
      ...lessonData,
      id: `lesson-${Date.now()}`,
    };
    setLessons(prev => [...prev, newLesson]);
    setActiveLessonId(newLesson.id);
    addToast(`Đã thêm bài học: "${newLesson.title}"`, 'success');
    return newLesson;
  };

  const updateLesson = (id: string, lessonData: Partial<Lesson>) => {
    setLessons(prev => prev.map(l => (l.id === id ? { ...l, ...lessonData } : l)));
    addToast('Đã cập nhật thông tin bài học!', 'success');
  };

  const deleteLesson = (id: string) => {
    setLessons(prev => prev.filter(l => l.id !== id));
    addToast('Đã xóa bài học!', 'info');
  };

  // Books
  const createBook = (name: string): Book => {
    const newBook: Book = {
      id: `book-${Date.now()}`,
      name,
      isCustom: true,
    };
    setBooks(prev => [...prev, newBook]);
    setActiveBookId(newBook.id);
    addToast(`Đã thêm bộ sách: "${name}"`, 'success');
    return newBook;
  };

  // Import / Export
  const exportQuestionSetAsJSON = (setId: string) => {
    const set = questionSets.find(s => s.id === setId);
    if (!set) {
      addToast('Không tìm thấy bộ câu hỏi để xuất!', 'error');
      return;
    }

    const lesson = lessons.find(l => l.id === set.lessonId);
    const cleanLessonTitle = lesson ? lesson.title.replace(/[^a-zA-Z0-9_]/g, '') : 'BaiHoc';
    const filename = `TinHoc${set.grade}_${cleanLessonTitle}_${new Date().toISOString().slice(0, 10)}.json`;

    const blob = new Blob([JSON.stringify(set, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(`Đã tải xuống tệp: ${filename}`, 'success');
  };

  const exportAllDataAsJSON = () => {
    const fullBackup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'RUNG CHUÔNG VÀNG – LINH TIN HỌC',
      books,
      lessons,
      questionSets,
    };

    const filename = `RungChuongVang_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(`Đã xuất toàn bộ dữ liệu ngân hàng thành công (${filename})`, 'success');
  };

  const importQuestionSetFromJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = validateQuestionSetJSON(parsed);
      if (!validation.isValid || !validation.questionSet) {
        addToast(`Nhập dữ liệu thất bại: ${validation.error}`, 'error');
        return { success: false, message: validation.error || 'Dữ liệu không hợp lệ' };
      }

      const importedSet = validation.questionSet;
      // Guarantee unique ID to avoid overwriting existing
      importedSet.id = `imported-${Date.now()}-${Math.random().toString().slice(2, 6)}`;
      importedSet.questions = importedSet.questions.map(q => ({
        ...q,
        id: `q-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      }));

      setQuestionSets(prev => [importedSet, ...prev]);
      setActiveGrade(importedSet.grade);
      setActiveQuestionSetId(importedSet.id);

      addToast(`Đã nhập thành công bộ câu hỏi: "${importedSet.title}" (${importedSet.questions.length} câu)`, 'success');
      return { success: true, message: 'Nhập thành công' };
    } catch (err: any) {
      const msg = `Lỗi phân tích tệp JSON: ${err.message || 'Cấu trúc không hợp lệ'}`;
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const importAllDataFromJSON = (jsonString: string): { success: boolean; message: string } => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.questionSets || !Array.isArray(parsed.questionSets)) {
        throw new Error('Tệp sao lưu thiếu danh sách bộ câu hỏi (questionSets)');
      }

      if (parsed.books && Array.isArray(parsed.books)) {
        setBooks(parsed.books);
      }
      if (parsed.lessons && Array.isArray(parsed.lessons)) {
        setLessons(parsed.lessons);
      }
      setQuestionSets(parsed.questionSets);

      addToast('Đã khôi phục toàn bộ ngân hàng câu hỏi từ bản sao lưu thành công!', 'success');
      return { success: true, message: 'Khôi phục hoàn tất' };
    } catch (err: any) {
      const msg = `Lỗi khôi phục sao lưu: ${err.message}`;
      addToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const resetToDefaultData = () => {
    setBooks(DEFAULT_BOOKS);
    setLessons(DEFAULT_LESSONS);
    setQuestionSets(DEFAULT_QUESTION_SETS);
    localStorage.removeItem(STORAGE_KEY_BOOKS);
    localStorage.removeItem(STORAGE_KEY_LESSONS);
    localStorage.removeItem(STORAGE_KEY_SETS);
    setActiveGrade(3);
    setActiveBookId('kn-tri-thuc');
    setActiveLessonId('l3-b3');
    setActiveQuestionSetId('set-l3-b3-1');
    addToast('Đã đặt lại dữ liệu mẫu gốc chuẩn SGK GDPT 2018!', 'info');
  };

  const saveGameHistory = (entry: Omit<GameHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: GameHistoryEntry = {
      ...entry,
      id: `hist-${Date.now()}`,
      timestamp: new Date().toLocaleString('vi-VN'),
    };
    setGameHistory(prev => [newEntry, ...prev.slice(0, 49)]); // keep latest 50
  };

  return (
    <GameContext.Provider
      value={{
        books,
        lessons,
        questionSets,
        activeGrade,
        activeBookId,
        activeLessonId,
        activeQuestionSetId,
        gameHistory,
        toasts,
        addToast,
        removeToast,
        setActiveGrade,
        setActiveBookId,
        setActiveLessonId,
        setActiveQuestionSetId,
        createQuestionSet,
        updateQuestionSet,
        deleteQuestionSet,
        duplicateQuestionSet,
        addQuestionToSet,
        updateQuestionInSet,
        deleteQuestionFromSet,
        duplicateQuestionInSet,
        createLesson,
        updateLesson,
        deleteLesson,
        createBook,
        exportQuestionSetAsJSON,
        exportAllDataAsJSON,
        importQuestionSetFromJSON,
        importAllDataFromJSON,
        resetToDefaultData,
        saveGameHistory,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
