import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { Difficulty, Grade, Question, QuestionSet } from '../types/game';
import { validateQuestion } from '../utils/gameRules';
import { exportQuestionSetToDocx, extractTextFromDocx, parseQuestionsFromText } from '../utils/wordExportImport';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Download,
  Upload,
  AlertTriangle,
  Eye,
  X,
  FileText,
  FileUp,
  Image as ImageIcon,
  ImagePlus,
} from 'lucide-react';

interface QuestionBankModalProps {
  onClose: () => void;
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({ onClose }) => {
  const {
    books,
    lessons,
    questionSets,
    activeGrade,
    activeBookId,
    activeLessonId,
    activeQuestionSetId,
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
    exportQuestionSetAsJSON,
    addToast,
  } = useGame();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | Difficulty>('all');

  // Question Edit Modal State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingNewQuestion, setIsAddingNewQuestion] = useState(false);

  // Set Edit Modal State
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);

  // Delete Confirm State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'set' | 'question'; id: string; name: string } | null>(null);

  // Active Set
  const currentSet = questionSets.find(s => s.id === activeQuestionSetId);
  const currentLesson = lessons.find(l => l.id === activeLessonId);
  const currentBook = books.find(b => b.id === activeBookId);
  const [isExportingWord, setIsExportingWord] = useState(false);

  const handleExportWord = async () => {
    if (!currentSet) return;
    setIsExportingWord(true);
    try {
      await exportQuestionSetToDocx(currentSet, {
        bookName: currentBook?.name,
        lessonTitle: currentLesson?.title,
      });
      addToast(`Đã xuất "${currentSet.title}" thành công sang tệp Word (.docx)!`, 'success');
    } catch (err: any) {
      addToast(`Lỗi khi xuất tệp Word: ${err?.message || 'Không thể tạo tài liệu'}`, 'error');
    } finally {
      setIsExportingWord(false);
    }
  };

  const handleImportWordFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSet) return;
    try {
      addToast('Đang đọc và trích xuất câu hỏi từ tệp Word...', 'info');
      const text = await extractTextFromDocx(file);
      const parsed = parseQuestionsFromText(text, activeGrade, activeBookId, activeLessonId);
      if (parsed.length === 0) {
        addToast('Không tìm thấy câu hỏi hợp lệ trong tệp Word. Cần có cấu trúc: Câu 1: ... A. ... B. ... C. ... D. ... Đáp án: ...', 'error');
        return;
      }
      parsed.forEach(q => addQuestionToSet(currentSet.id, q));
      addToast(`Đã thêm thành công ${parsed.length} câu hỏi từ tệp Word "${file.name}"!`, 'success');
      e.target.value = '';
    } catch (err: any) {
      addToast(`Lỗi khi đọc tệp Word: ${err?.message || 'Không thể phân tích tệp'}`, 'error');
    }
  };

  // Filtered Questions in Set
  const filteredQuestions = useMemo(() => {
    if (!currentSet) return [];
    return currentSet.questions.filter(q => {
      const matchSearch =
        q.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.options.some(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchDiff = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
      return matchSearch && matchDiff;
    });
  }, [currentSet, searchTerm, filterDifficulty]);

  // Form state for question editor
  const [formContent, setFormContent] = useState('');
  const [formOptions, setFormOptions] = useState<[string, string, string, string]>(['', '', '', '']);
  const [formOptionImages, setFormOptionImages] = useState<[string, string, string, string]>(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('medium');
  const [formCustomTime, setFormCustomTime] = useState<number>(20);
  const [formImageUrl, setFormImageUrl] = useState('');

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoaded: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn tệp hình ảnh (PNG, JPG, WEBP)!', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      if (result) onLoaded(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openNewQuestionForm = () => {
    setFormContent('');
    setFormOptions(['', '', '', '']);
    setFormOptionImages(['', '', '', '']);
    setFormCorrectAnswer(0);
    setFormExplanation('');
    setFormDifficulty('medium');
    setFormCustomTime(currentSet?.defaultTimeSeconds || 20);
    setFormImageUrl('');
    setEditingQuestion(null);
    setIsAddingNewQuestion(true);
  };

  const openEditQuestionForm = (q: Question) => {
    setFormContent(q.content);
    setFormOptions([q.options[0] || '', q.options[1] || '', q.options[2] || '', q.options[3] || '']);
    setFormOptionImages([
      q.optionImages?.[0] || '',
      q.optionImages?.[1] || '',
      q.optionImages?.[2] || '',
      q.optionImages?.[3] || '',
    ]);
    setFormCorrectAnswer(q.correctAnswer);
    setFormExplanation(q.explanation || '');
    setFormDifficulty(q.difficulty);
    setFormCustomTime(q.customTimeSeconds || 20);
    setFormImageUrl(q.imageUrl || '');
    setEditingQuestion(q);
    setIsAddingNewQuestion(true);
  };

  const handleSaveQuestion = () => {
    if (!currentSet) return;

    const optionImagesFiltered = formOptionImages.map(img => img.trim() || undefined);
    const hasAnyOptionImage = optionImagesFiltered.some(img => img !== undefined);

    const candidateQuestion = {
      content: formContent.trim(),
      options: formOptions.map(o => o.trim()),
      correctAnswer: formCorrectAnswer,
      explanation: formExplanation.trim(),
      grade: currentSet.grade,
      bookId: currentSet.bookId,
      lessonId: currentSet.lessonId,
      topic: currentSet.topic,
      difficulty: formDifficulty,
      points: 10,
      customTimeSeconds: Math.min(60, Math.max(1, formCustomTime)),
      imageUrl: formImageUrl.trim() || undefined,
      optionImages: hasAnyOptionImage ? optionImagesFiltered : undefined,
    };

    const validation = validateQuestion(candidateQuestion);
    if (!validation.isValid) {
      addToast(validation.error || 'Dữ liệu không hợp lệ', 'error');
      return;
    }

    if (editingQuestion) {
      updateQuestionInSet(currentSet.id, editingQuestion.id, candidateQuestion);
    } else {
      addQuestionToSet(currentSet.id, candidateQuestion);
    }

    setIsAddingNewQuestion(false);
    setEditingQuestion(null);
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-3xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] border border-gray-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-amber-300 flex items-center justify-center shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-blue-950 uppercase">
                Ngân hàng câu hỏi Tin học
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Quản lý, chỉnh sửa, bổ sung và xuất/nhập đề theo bài học GDPT 2018
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar + Main List */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
          {/* Sidebar: Navigation Filters */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-gray-200 flex flex-col gap-3 overflow-y-auto">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Khối lớp:</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([3, 4, 5] as Grade[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setActiveGrade(g)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      activeGrade === g
                        ? 'bg-amber-400 text-blue-950 border-amber-500 shadow'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Lớp {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Bộ sách:</label>
              <select
                value={activeBookId}
                onChange={e => setActiveBookId(e.target.value)}
                aria-label="Chọn bộ sách"
                className="w-full p-2 text-xs rounded-xl border border-gray-300 font-medium"
              >
                {books.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Bài học:</label>
              <select
                value={activeLessonId}
                onChange={e => setActiveLessonId(e.target.value)}
                aria-label="Chọn bài học"
                className="w-full p-2 text-xs rounded-xl border border-gray-300 font-medium truncate"
              >
                {lessons
                  .filter(l => l.grade === activeGrade && l.bookId === activeBookId)
                  .map(l => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Set Selection inside lesson */}
            <div className="pt-2 border-t border-gray-100 flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700">Các bộ câu hỏi của bài:</span>
                <button
                  onClick={() => {
                    const newSet = createQuestionSet({
                      title: `Bộ câu hỏi ${new Date().toLocaleDateString('vi-VN')}`,
                      grade: activeGrade,
                      bookId: activeBookId,
                      lessonId: activeLessonId,
                      topic: currentLesson?.topic || 'Tin học',
                      questions: [],
                    });
                    setActiveQuestionSetId(newSet.id);
                  }}
                  className="text-[11px] text-blue-700 hover:underline font-bold flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Thêm bộ
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {questionSets
                  .filter(s => s.lessonId === activeLessonId)
                  .map(set => {
                    const isSelected = activeQuestionSetId === set.id;
                    return (
                      <div
                        key={set.id}
                        onClick={() => setActiveQuestionSetId(set.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-900 font-bold text-blue-950'
                            : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div>{set.title}</div>
                          <div className="text-[10px] text-gray-500 font-normal">
                            {set.questions.length} câu hỏi
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              duplicateQuestionSet(set.id);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-700"
                            title="Sao chép bộ này"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setItemToDelete({ type: 'set', id: set.id, name: set.title });
                            }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Xóa bộ câu hỏi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Main Area: Questions list of selected set */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 border border-gray-200 flex flex-col overflow-hidden">
            {/* Set Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  {currentSet ? currentSet.title : 'Chưa chọn bộ câu hỏi'}
                </h3>
                <p className="text-xs text-gray-500">
                  {currentSet?.questions.length || 0} câu hỏi trong bộ • Thời gian mặc định:{' '}
                  {currentSet?.defaultTimeSeconds || 20}s
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentSet && (
                  <>
                    <button
                      onClick={handleExportWord}
                      disabled={isExportingWord}
                      className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-900 flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                      title="Xuất bộ câu hỏi này ra tệp Word (.docx) chuẩn đề thi để in ấn"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-700" />
                      {isExportingWord ? 'Đang xuất...' : 'Xuất ra Word'}
                    </button>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-900 flex items-center gap-1.5 shadow-sm transition-all" title="Tải tệp Word (.docx) chứa câu hỏi và đáp án vào bộ này">
                      <FileUp className="w-3.5 h-3.5 text-emerald-700" />
                      Nhập từ Word
                      <input
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleImportWordFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => exportQuestionSetAsJSON(currentSet.id)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 flex items-center gap-1"
                      title="Xuất bộ này ra tệp JSON"
                    >
                      <Download className="w-3.5 h-3.5" /> Xuất JSON
                    </button>
                    <button
                      onClick={openNewQuestionForm}
                      className="px-4 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Plus className="w-4 h-4" /> Thêm câu hỏi
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm câu hỏi theo nội dung hoặc đáp án..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <select
                value={filterDifficulty}
                onChange={e => setFilterDifficulty(e.target.value as any)}
                aria-label="Lọc theo mức độ khó"
                className="py-1.5 px-3 rounded-xl border border-gray-200 text-xs font-medium"
              >
                <option value="all">Tất cả mức độ</option>
                <option value="easy">Dễ (Nhận biết)</option>
                <option value="medium">Trung bình (Thông hiểu)</option>
                <option value="hard">Khó (Vận dụng)</option>
              </select>
            </div>

            {/* Question Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {!currentSet || currentSet.questions.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-sm font-semibold mb-2">Bộ câu hỏi này chưa có câu hỏi nào.</p>
                  <button
                    onClick={openNewQuestionForm}
                    className="bg-blue-900 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    + Tạo câu hỏi đầu tiên
                  </button>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Không có câu hỏi nào khớp với tìm kiếm.
                </div>
              ) : (
                filteredQuestions.map((q, idx) => {
                  const diffColor =
                    q.difficulty === 'easy'
                      ? 'bg-emerald-100 text-emerald-800'
                      : q.difficulty === 'hard'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800';
                  const diffLabel =
                    q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình';

                  return (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 shadow-2xs space-y-2.5 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-blue-950">#{idx + 1}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${diffColor}`}>
                            {diffLabel}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {q.customTimeSeconds || currentSet.defaultTimeSeconds || 20}s
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => duplicateQuestionInSet(currentSet.id, q.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-gray-100"
                            title="Nhân bản câu hỏi"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditQuestionForm(q)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-gray-100"
                            title="Sửa câu hỏi"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'question',
                                id: q.id,
                                name: q.content,
                              })
                            }
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-gray-100"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="font-bold text-sm text-gray-900 leading-snug">
                        {q.content}
                      </div>

                      {/* Question image thumbnail preview if present */}
                      {q.imageUrl && (
                        <div className="my-2">
                          <img
                            src={q.imageUrl}
                            alt="Ảnh minh họa câu hỏi"
                            className="h-24 max-w-full rounded-xl object-contain border border-gray-200 bg-gray-50 p-1 shadow-sm"
                          />
                        </div>
                      )}

                      {/* 4 Options preview */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                              oIdx === q.correctAnswer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-gray-50 border-gray-200 text-gray-700'
                            }`}
                          >
                            <span className="font-mono text-gray-500 font-bold flex-shrink-0">
                              {optionLetters[oIdx]}.
                            </span>
                            {q.optionImages?.[oIdx] && (
                              <img
                                src={q.optionImages[oIdx]}
                                alt={`Ảnh ${optionLetters[oIdx]}`}
                                className="w-8 h-8 rounded object-contain bg-white border border-gray-200 flex-shrink-0"
                              />
                            )}
                            <span className="truncate">{opt}</span>
                            {oIdx === q.correctAnswer && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                          <strong>Giải thích:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QUESTION EDITOR MODAL */}
      {isAddingNewQuestion && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-lg text-blue-950 uppercase">
                {editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
              </h3>
              <button
                onClick={() => setIsAddingNewQuestion(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Nội dung câu hỏi (*):</label>
                <textarea
                  rows={2}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              {/* Question Image (Optional) */}
              <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-950 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-700" />
                    Hình ảnh minh họa cho câu hỏi (Tùy chọn):
                  </label>
                  {formImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="text-[11px] text-red-600 hover:underline font-bold"
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Dán link ảnh (https://...) hoặc tải ảnh từ máy tính"
                    value={formImageUrl}
                    onChange={e => setFormImageUrl(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none bg-white"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1 flex-shrink-0 shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    Tải ảnh lên
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleImageFileUpload(e, url => setFormImageUrl(url))}
                      className="hidden"
                    />
                  </label>
                </div>

                {formImageUrl && (
                  <div className="mt-2 flex justify-center p-2 bg-white rounded-xl border border-blue-200">
                    <img
                      src={formImageUrl}
                      alt="Xem trước ảnh câu hỏi"
                      className="max-h-36 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>

              {/* 4 Options with optional images */}
              <div className="space-y-2.5">
                <label className="font-bold text-gray-700 block">
                  Bốn phương án trả lời, ảnh & Chọn đáp án đúng (*):
                </label>
                {([0, 1, 2, 3] as const).map(i => (
                  <div key={i} className="p-2.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormCorrectAnswer(i)}
                        className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all flex-shrink-0 ${
                          formCorrectAnswer === i
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                        title={formCorrectAnswer === i ? 'Đáp án đúng' : 'Nhấp để chọn làm đáp án đúng'}
                      >
                        {optionLetters[i]}
                      </button>
                      <input
                        type="text"
                        placeholder={`Nội dung phương án ${optionLetters[i]}...`}
                        value={formOptions[i]}
                        onChange={e => {
                          const val = e.target.value;
                          setFormOptions(prev => {
                            const copy = [...prev] as [string, string, string, string];
                            copy[i] = val;
                            return copy;
                          });
                        }}
                        className="flex-1 p-2 rounded-xl border border-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                      />
                      <label
                        className="cursor-pointer p-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 flex items-center gap-1 text-[11px] font-semibold flex-shrink-0 shadow-sm"
                        title={`Thêm ảnh cho phương án ${optionLetters[i]}`}
                      >
                        <ImagePlus className="w-4 h-4 text-blue-700" />
                        <span className="hidden sm:inline">Ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e =>
                            handleImageFileUpload(e, url => {
                              setFormOptionImages(prev => {
                                const copy = [...prev] as [string, string, string, string];
                                copy[i] = url;
                                return copy;
                              });
                            })
                          }
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Option Image preview if attached */}
                    {formOptionImages[i] && (
                      <div className="flex items-center gap-2 pl-11">
                        <div className="relative inline-block border border-gray-300 rounded-lg p-1 bg-white">
                          <img
                            src={formOptionImages[i]}
                            alt={`Ảnh phương án ${optionLetters[i]}`}
                            className="h-14 w-20 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormOptionImages(prev => {
                                const copy = [...prev] as [string, string, string, string];
                                copy[i] = '';
                                return copy;
                              })
                            }
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] shadow"
                            title="Xóa ảnh phương án này"
                          >
                            ✕
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-500 italic">
                          Đã đính kèm ảnh cho phương án {optionLetters[i]}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Lời giải thích chuẩn GDPT 2018:
                </label>
                <textarea
                  rows={2}
                  placeholder="Giải thích vì sao phương án trên là đáp án đúng..."
                  value={formExplanation}
                  onChange={e => setFormExplanation(e.target.value)}
                  className="w-full p-2 rounded-xl border border-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Metadata: Difficulty & Custom Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Mức độ nhận thức:</label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value as Difficulty)}
                    className="w-full p-2 rounded-xl border border-gray-300 font-medium"
                  >
                    <option value="easy">Dễ (Nhận biết)</option>
                    <option value="medium">Trung bình (Thông hiểu)</option>
                    <option value="hard">Khó (Vận dụng)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Thời gian riêng cho câu (1 – 60 giây):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formCustomTime}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setFormCustomTime(Math.min(60, Math.max(1, val)));
                      }
                    }}
                    className="w-full p-2 rounded-xl border border-gray-300 font-bold text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsAddingNewQuestion(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-xs text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-blue-950 font-black text-xs shadow"
              >
                Lưu câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-70 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-gray-900">
              Xác nhận xóa {itemToDelete.type === 'set' ? 'bộ câu hỏi' : 'câu hỏi'}?
            </h4>
            <p className="text-xs text-gray-500 line-clamp-2">
              "{itemToDelete.name}" sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (itemToDelete.type === 'set') {
                    deleteQuestionSet(itemToDelete.id);
                  } else if (currentSet) {
                    deleteQuestionFromSet(currentSet.id, itemToDelete.id);
                  }
                  setItemToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
