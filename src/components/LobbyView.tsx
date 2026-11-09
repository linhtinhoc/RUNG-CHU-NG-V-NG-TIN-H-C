import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { GameMode, GameSettings, Grade, Question } from '../types/game';
import { GoldenBellLogo } from './GoldenBellLogo';
import { soundManager } from '../utils/soundEffects';
import {
  BookOpen,
  Sparkles,
  Clock,
  Play,
  Users,
  User,
  Shield,
  Layers,
  CheckCircle2,
  Filter,
  Plus,
  Copy,
  Shuffle,
  AlertCircle,
  HelpCircle,
  Settings2,
  Search,
  QrCode,
} from 'lucide-react';

interface LobbyViewProps {
  onStartGame: (settings: GameSettings) => void;
  onOpenQuestionBank: () => void;
  onOpenAiGenerator: () => void;
  onOpenGuide: () => void;
  onOpenShareQr?: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onStartGame,
  onOpenQuestionBank,
  onOpenAiGenerator,
  onOpenGuide,
  onOpenShareQr,
}) => {
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
    duplicateQuestionSet,
    createLesson,
    createBook,
    addToast,
  } = useGame();

  // Wizard Tab: 'basic' (Steps 1-4) | 'settings' (Steps 5-7) | 'preview' (Step 8)
  const [activeStepTab, setActiveStepTab] = useState<'content' | 'config' | 'summary'>('content');

  // Search & Filter in Lesson selection
  const [lessonSearch, setLessonSearch] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState('all');

  // Modals for quick-creating Book, Lesson, Set
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [newBookName, setNewBookName] = useState('');

  const [showNewLessonModal, setShowNewLessonModal] = useState(false);
  const [newLessonNumber, setNewLessonNumber] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonTopic, setNewLessonTopic] = useState('');

  const [showNewSetModal, setShowNewSetModal] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState('');

  // Game Settings State
  const [gameMode, setGameMode] = useState<GameMode>('individual');
  const [singlePlayerName, setSinglePlayerName] = useState('Học sinh thông thái');
  
  // Multiplayer
  const [multiplayerList, setMultiplayerList] = useState<string[]>([
    'Bạn An',
    'Bạn Minh',
    'Bạn Khoa',
  ]);
  const [newPlayerInput, setNewPlayerInput] = useState('');

  // Team mode (2-6 teams)
  const [teams, setTeams] = useState([
    { id: 't1', name: 'Đội Vàng Rực Rỡ', color: '#EAB308' },
    { id: 't2', name: 'Đội Xanh Hy Vọng', color: '#2563EB' },
    { id: 't3', name: 'Đội Đỏ Quyết Thắng', color: '#DC2626' },
  ]);

  // Question selection settings
  const [selectionMode, setSelectionMode] = useState<'all' | 'count' | 'manual'>('count');
  const [requestedCount, setRequestedCount] = useState<number>(10);
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  // Time settings
  const [timeMode, setTimeMode] = useState<'global' | 'custom'>('global');
  const [globalTimeSeconds, setGlobalTimeSeconds] = useState<number>(20);

  // Points
  const [pointsPerCorrect, setPointsPerCorrect] = useState<number>(10);
  const [pointsPerWrong, setPointsPerWrong] = useState<number>(0);

  // FX
  const [enableAudio, setEnableAudio] = useState(true);
  const [enableAnimation, setEnableAnimation] = useState(true);
  const [enableConfetti, setEnableConfetti] = useState(true);

  // Computed lists
  const currentBooks = books;
  const currentLessons = useMemo(() => {
    return lessons.filter(l => l.grade === activeGrade && l.bookId === activeBookId);
  }, [lessons, activeGrade, activeBookId]);

  const uniqueTopics = useMemo(() => {
    const set = new Set<string>();
    currentLessons.forEach(l => {
      if (l.topic) set.add(l.topic);
    });
    return Array.from(set);
  }, [currentLessons]);

  const filteredLessons = useMemo(() => {
    return currentLessons.filter(l => {
      const matchSearch = l.title.toLowerCase().includes(lessonSearch.toLowerCase()) ||
        (l.topic && l.topic.toLowerCase().includes(lessonSearch.toLowerCase()));
      const matchTopic = selectedTopicFilter === 'all' || l.topic === selectedTopicFilter;
      return matchSearch && matchTopic;
    });
  }, [currentLessons, lessonSearch, selectedTopicFilter]);

  const currentLesson = useMemo(() => {
    return lessons.find(l => l.id === activeLessonId);
  }, [lessons, activeLessonId]);

  const currentSets = useMemo(() => {
    return questionSets.filter(s => s.lessonId === activeLessonId);
  }, [questionSets, activeLessonId]);

  const currentSet = useMemo(() => {
    return questionSets.find(s => s.id === activeQuestionSetId) || currentSets[0] || null;
  }, [questionSets, activeQuestionSetId, currentSets]);

  const totalQuestionsInSet = currentSet?.questions.length || 0;

  // Initialize manual selection when set changes
  React.useEffect(() => {
    if (currentSet) {
      setManualSelectedIds(currentSet.questions.map(q => q.id));
      if (currentSet.defaultTimeSeconds) {
        setGlobalTimeSeconds(currentSet.defaultTimeSeconds);
      }
    }
  }, [currentSet?.id]);

  const handleStartGame = () => {
    if (!currentSet || currentSet.questions.length === 0) {
      addToast('Bộ câu hỏi hiện đang trống. Hãy thêm câu hỏi trước khi bắt đầu!', 'error');
      return;
    }

    // Effective question count calculation
    let effectiveCount = totalQuestionsInSet;
    if (selectionMode === 'manual') {
      if (manualSelectedIds.length === 0) {
        addToast('Vui lòng chọn ít nhất 1 câu hỏi để chơi!', 'error');
        return;
      }
      effectiveCount = manualSelectedIds.length;
    } else if (selectionMode === 'count') {
      if (requestedCount < 1) {
        addToast('Số lượng câu hỏi phải lớn hơn 0!', 'error');
        return;
      }
      effectiveCount = Math.min(requestedCount, totalQuestionsInSet);
    }

    const settings: GameSettings = {
      mode: gameMode,
      timeMode,
      globalTimeSeconds: Math.min(60, Math.max(1, globalTimeSeconds)),
      questionCount: effectiveCount,
      selectedQuestionIds: manualSelectedIds,
      selectionMode,
      difficultyFilter,
      topicFilter: 'all',
      shuffleQuestions,
      shuffleOptions,
      pointsPerCorrect,
      pointsPerWrong,
      pointsPerSkip: 0,
      enableAudio,
      enableAnimation,
      enableConfetti,
      players:
        gameMode === 'individual'
          ? [{ id: 'p1', name: singlePlayerName.trim() || 'Học sinh' }]
          : multiplayerList.map((name, i) => ({ id: `p-${i}`, name })),
      teams,
    };

    soundManager.playBell();
    onStartGame(settings);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero Game Title Banner */}
      <div className="bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700 rounded-3xl p-6 sm:p-8 text-blue-950 shadow-2xl relative overflow-hidden mb-8 border-4 border-yellow-300">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-yellow-200/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-amber-400/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 text-center md:text-left">
            <GoldenBellLogo size="xl" />
            <div>
              <div className="inline-block bg-blue-950 text-amber-300 font-extrabold text-xs sm:text-sm px-3.5 py-1 rounded-full uppercase tracking-widest shadow-md mb-2">
                Hội thi trí tuệ tiểu học
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-blue-950 drop-shadow-sm uppercase">
                Rung Chuông Vàng
              </h1>
              <p className="text-base sm:text-xl font-bold text-blue-900 mt-1">
                Linh Tin Học – GDPT 2018 (Lớp {activeGrade})
              </p>
              <p className="text-xs sm:text-sm text-blue-950/80 font-medium max-w-xl mt-1">
                Tổ chức thi đấu sinh động trên máy chiếu, tùy biến thời gian, ngân hàng câu hỏi chuẩn SGK & tạo câu hỏi bằng AI.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveStepTab('summary')}
              className="bg-blue-950 hover:bg-blue-900 text-amber-300 hover:text-yellow-200 font-black px-6 py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-base sm:text-lg border-2 border-amber-300 transform hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              BẮT ĐẦU VÒNG THI
            </button>
            {onOpenShareQr && (
              <button
                onClick={onOpenShareQr}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all border border-emerald-400/50"
                title="Chiếu mã QR để học sinh quét điện thoại tham gia thi (Không cần Gmail)"
              >
                <QrCode className="w-4 h-4 text-amber-300" />
                <span>Mã QR học sinh quét tham gia</span>
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={onOpenAiGenerator}
                className="flex-1 bg-white/80 hover:bg-white text-blue-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Tạo câu hỏi AI
              </button>
              <button
                onClick={onOpenQuestionBank}
                className="flex-1 bg-white/80 hover:bg-white text-blue-950 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                Ngân hàng đề
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Steps Navigation Bar */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-2xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveStepTab('content')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
            activeStepTab === 'content'
              ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-amber-300 shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>1. Chọn Bài học & Bộ đề</span>
        </button>

        <button
          onClick={() => setActiveStepTab('config')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
            activeStepTab === 'config'
              ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-amber-300 shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>2. Thiết lập Lượt chơi & Thời gian</span>
        </button>

        <button
          onClick={() => setActiveStepTab('summary')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
            activeStepTab === 'summary'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-blue-950 shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>3. Sẵn sàng Rung Chuông</span>
        </button>
      </div>

      {/* TAB 1: CONTENT SELECTION (STEPS 1 - 4) */}
      {activeStepTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Grade & Textbook Selection (Steps 1 & 2) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Step 1: Chọn Khối lớp */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-blue-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="font-extrabold text-gray-800 text-base">Khối lớp Tin học</h2>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([3, 4, 5] as Grade[]).map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      setActiveGrade(g);
                      soundManager.playTick();
                    }}
                    className={`py-3 rounded-xl font-extrabold text-sm border-2 transition-all ${
                      activeGrade === g
                        ? 'border-amber-500 bg-amber-50 text-blue-950 shadow-md scale-102'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Lớp {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Chọn Bộ sách giáo khoa */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-extrabold text-gray-800 text-base">Bộ sách giáo khoa</h2>
                </div>
                <button
                  onClick={() => setShowNewBookModal(true)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm sách
                </button>
              </div>

              <div className="space-y-2">
                {currentBooks.map(book => {
                  const isSelected = activeBookId === book.id;
                  return (
                    <div
                      key={book.id}
                      onClick={() => {
                        setActiveBookId(book.id);
                        soundManager.playTick();
                      }}
                      className={`p-3 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-blue-900 bg-blue-50/60 font-bold text-blue-950 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-sm">{book.name}</span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-800" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Bộ câu hỏi của bài */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                    4
                  </span>
                  <h2 className="font-extrabold text-gray-800 text-base">Bộ câu hỏi đã lưu</h2>
                </div>
                <button
                  onClick={() => setShowNewSetModal(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo bộ mới
                </button>
              </div>

              {currentSets.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">Chưa có bộ câu hỏi nào cho bài này.</p>
                  <button
                    onClick={() => setShowNewSetModal(true)}
                    className="bg-amber-500 text-blue-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow"
                  >
                    Tạo bộ câu hỏi ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {currentSets.map(set => {
                    const isSelected = activeQuestionSetId === set.id;
                    return (
                      <div
                        key={set.id}
                        onClick={() => {
                          setActiveQuestionSetId(set.id);
                          soundManager.playTick();
                        }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                            : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-gray-900">{set.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {set.questions.length} câu hỏi • Mặc định {set.defaultTimeSeconds}s
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-amber-200/50">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              duplicateQuestionSet(set.id);
                            }}
                            className="text-xs text-blue-700 hover:underline flex items-center gap-1"
                            title="Sao chép bộ này để chỉnh sửa phiên bản khác"
                          >
                            <Copy className="w-3 h-3" /> Sao chép
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Lessons List (Step 3) */}
          <div className="lg:col-span-8 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-900 text-amber-300 font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="font-extrabold text-gray-800 text-lg">
                  Chọn bài học môn Tin học Lớp {activeGrade}
                </h2>
              </div>
              <button
                onClick={() => setShowNewLessonModal(true)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm bài học mới
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm bài học..."
                  value={lessonSearch}
                  onChange={e => setLessonSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTopicFilter}
                  onChange={e => setSelectedTopicFilter(e.target.value)}
                  aria-label="Lọc bài học theo chủ đề kiến thức"
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="all">Tất cả chủ đề</option>
                  {uniqueTopics.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lessons List */}
            <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-1">
              {filteredLessons.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl">
                  Không tìm thấy bài học nào phù hợp. Hãy thử tìm từ khóa khác hoặc thêm bài mới!
                </div>
              ) : (
                filteredLessons.map(lesson => {
                  const isSelected = activeLessonId === lesson.id;
                  const setsForLesson = questionSets.filter(s => s.lessonId === lesson.id);
                  const totalQ = setsForLesson.reduce((acc, s) => acc + s.questions.length, 0);

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setActiveLessonId(lesson.id);
                        soundManager.playTick();
                      }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-900 bg-gradient-to-r from-blue-50 to-indigo-50/50 shadow-md scale-101'
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-md">
                            {lesson.topic || 'Tin học'}
                          </span>
                          <span className="text-xs font-medium text-gray-500">
                            {setsForLesson.length} bộ đề • {totalQ} câu hỏi
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-gray-900">{lesson.title}</h3>
                        {lesson.summary && (
                          <p className="text-xs text-gray-600 line-clamp-1">{lesson.summary}</p>
                        )}
                      </div>

                      {isSelected ? (
                        <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-300 flex items-center justify-center flex-shrink-0 shadow-md">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveLessonId(lesson.id);
                            setActiveStepTab('config');
                          }}
                          className="text-xs bg-gray-100 hover:bg-amber-100 hover:text-amber-900 text-gray-700 font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                        >
                          Chọn bài này
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Next Step Bar */}
            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-xs text-gray-600 font-medium">
                Đang chọn:{' '}
                <strong className="text-blue-950 font-bold">
                  {currentLesson?.title || 'Chưa chọn'}
                </strong>{' '}
                • {currentSet?.title || 'Chưa có bộ đề'}
              </div>
              <button
                onClick={() => setActiveStepTab('config')}
                className="bg-blue-900 hover:bg-blue-800 text-amber-300 font-bold text-sm px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow"
              >
                Tiếp tục thiết lập luật chơi →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURATION (STEPS 5 - 7) */}
      {activeStepTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Step 5: Tùy chỉnh số lượng câu hỏi */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-7 h-7 rounded-full bg-blue-900 text-amber-300 font-bold text-sm flex items-center justify-center">
                5
              </span>
              <div>
                <h2 className="font-extrabold text-gray-900 text-base">Tùy chỉnh số lượng câu hỏi</h2>
                <p className="text-xs text-gray-500">
                  Bộ đề hiện có: <strong className="text-amber-700">{totalQuestionsInSet} câu hỏi</strong>
                </p>
              </div>
            </div>

            {/* Selection Mode: Count vs All vs Manual */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Hình thức chọn câu hỏi
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSelectionMode('count')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                    selectionMode === 'count'
                      ? 'border-blue-900 bg-blue-50 text-blue-950'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Chọn theo số lượng
                </button>
                <button
                  onClick={() => setSelectionMode('all')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                    selectionMode === 'all'
                      ? 'border-blue-900 bg-blue-50 text-blue-950'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Chơi toàn bộ ({totalQuestionsInSet} câu)
                </button>
                <button
                  onClick={() => setSelectionMode('manual')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                    selectionMode === 'manual'
                      ? 'border-blue-900 bg-blue-50 text-blue-950'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Chọn thủ công từng câu
                </button>
              </div>
            </div>

            {/* Quick Count Selection if mode is 'count' */}
            {selectionMode === 'count' && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <label className="text-xs font-bold text-gray-700 block">
                  Nhập số lượng câu hỏi muốn chơi trong lượt:
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {[5, 10, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      disabled={cnt > totalQuestionsInSet}
                      onClick={() => setRequestedCount(cnt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        requestedCount === cnt
                          ? 'bg-amber-400 text-blue-950 border-amber-500 shadow'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {cnt} câu
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-gray-600">Hoặc tự nhập:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalQuestionsInSet}
                      value={requestedCount}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          setRequestedCount(Math.min(totalQuestionsInSet, Math.max(1, val)));
                        }
                      }}
                      className="w-16 px-2 py-1 text-center font-bold text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
                {requestedCount > totalQuestionsInSet && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Bộ câu hỏi chỉ có tối đa {totalQuestionsInSet} câu.
                  </p>
                )}
              </div>
            )}

            {/* Manual Checkbox List if mode is 'manual' */}
            {selectionMode === 'manual' && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-gray-700">
                    Đã chọn {manualSelectedIds.length}/{totalQuestionsInSet} câu
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => setManualSelectedIds(currentSet?.questions.map(q => q.id) || [])}
                      className="text-blue-700 hover:underline"
                    >
                      Chọn tất cả
                    </button>
                    <span>•</span>
                    <button onClick={() => setManualSelectedIds([])} className="text-red-600 hover:underline">
                      Bỏ chọn
                    </button>
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {currentSet?.questions.map((q, idx) => {
                    const isChecked = manualSelectedIds.includes(q.id);
                    return (
                      <label
                        key={q.id}
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-gray-200 text-xs cursor-pointer hover:bg-amber-50/50"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setManualSelectedIds(prev => [...prev, q.id]);
                            } else {
                              setManualSelectedIds(prev => prev.filter(id => id !== q.id));
                            }
                          }}
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-400"
                        />
                        <span className="text-gray-800 line-clamp-1">
                          <strong>Câu {idx + 1}:</strong> {q.content}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Difficulty Filter & Shuffling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Lọc theo mức độ</label>
                <select
                  value={difficultyFilter}
                  onChange={e => setDifficultyFilter(e.target.value as any)}
                  aria-label="Lọc câu hỏi theo mức độ khó"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="all">Tất cả mức độ (40% dễ - 40% TB - 20% khó)</option>
                  <option value="easy">Chỉ lấy câu Dễ (Nhận biết)</option>
                  <option value="medium">Chỉ lấy câu Trung bình (Thông hiểu)</option>
                  <option value="hard">Chỉ lấy câu Khó (Vận dụng)</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={e => setShuffleQuestions(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <Shuffle className="w-3.5 h-3.5 text-blue-800" />
                  Trộn ngẫu nhiên thứ tự câu hỏi
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={e => setShuffleOptions(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-400"
                  />
                  <Shuffle className="w-3.5 h-3.5 text-emerald-700" />
                  Trộn thứ tự 4 đáp án A, B, C, D
                </label>
              </div>
            </div>
          </div>

          {/* Step 6: Tùy chỉnh thời gian mỗi câu hỏi (5s - 60s max) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-7 h-7 rounded-full bg-blue-900 text-amber-300 font-bold text-sm flex items-center justify-center">
                6
              </span>
              <div>
                <h2 className="font-extrabold text-gray-900 text-base">Tùy chỉnh thời gian mỗi câu</h2>
                <p className="text-xs text-gray-500">Giới hạn từ 5 đến tối đa 60 giây theo quy định</p>
              </div>
            </div>

            {/* Time Mode */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTimeMode('global')}
                className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                  timeMode === 'global'
                    ? 'border-blue-900 bg-blue-50 text-blue-950'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Chế độ A: Thời gian chung
              </button>
              <button
                onClick={() => setTimeMode('custom')}
                className={`p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                  timeMode === 'custom'
                    ? 'border-blue-900 bg-blue-50 text-blue-950'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                Chế độ B: Thời gian riêng từng câu
              </button>
            </div>

            {/* Global Time Setting Presets */}
            {timeMode === 'global' ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <label className="text-xs font-bold text-gray-700 block">
                  Chọn nhanh thời gian chung cho tất cả các câu:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 30, 45, 60].map(sec => (
                    <button
                      key={sec}
                      onClick={() => setGlobalTimeSeconds(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        globalTimeSeconds === sec
                          ? 'bg-amber-400 text-blue-950 border-amber-500 shadow'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {sec} giây
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">Hoặc nhập số giây (1 – 60s):</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={globalTimeSeconds}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setGlobalTimeSeconds(Math.min(60, Math.max(1, val)));
                      }
                    }}
                    className="w-20 px-2 py-1 text-center font-bold text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs text-amber-700 font-semibold">giây (tối đa 60s)</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <p className="text-xs text-gray-600">
                  Ở Chế độ B, ứng dụng sẽ sử dụng thời gian đã thiết lập riêng cho từng câu trong ngân hàng câu hỏi.
                  Nếu câu nào chưa có thời gian riêng, sẽ áp dụng thời gian mặc định ({globalTimeSeconds} giây).
                </p>
                <div className="text-xs font-semibold text-blue-900 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  Thời gian từng câu có thể xem và chỉnh sửa trực tiếp trong tab <strong>Ngân hàng câu hỏi</strong>.
                </div>
              </div>
            )}

            {/* Step 7: Game Mode & Rules */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-900 text-amber-300 font-bold text-sm flex items-center justify-center">
                  7
                </span>
                <h3 className="font-extrabold text-gray-900 text-base">Chế độ thi đấu</h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setGameMode('individual')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                    gameMode === 'individual'
                      ? 'border-blue-900 bg-blue-50 text-blue-950'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <User className="w-5 h-5 text-blue-700" />
                  <span>Cá nhân</span>
                </button>

                <button
                  onClick={() => setGameMode('multiplayer')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                    gameMode === 'multiplayer'
                      ? 'border-blue-900 bg-blue-50 text-blue-950'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5 text-amber-600" />
                  <span>Nhiều người chơi</span>
                </button>

                <button
                  onClick={() => setGameMode('team')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                    gameMode === 'team'
                      ? 'border-blue-900 bg-blue-50 text-blue-950'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span>Thi đấu theo đội</span>
                </button>
              </div>

              {/* Mode-specific configuration */}
              {gameMode === 'individual' && (
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-xs font-bold text-gray-600">Tên học sinh / người chơi:</label>
                  <input
                    type="text"
                    value={singlePlayerName}
                    onChange={e => setSinglePlayerName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}

              {gameMode === 'multiplayer' && (
                <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
                  <label className="text-xs font-bold text-gray-700 block">
                    Danh sách người chơi (luân phiên trên cùng thiết bị):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {multiplayerList.map((player, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-gray-300 text-gray-800 text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm font-medium"
                      >
                        {player}
                        {multiplayerList.length > 1 && (
                          <button
                            onClick={() => setMultiplayerList(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 font-bold hover:text-red-700"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Thêm tên học sinh..."
                      value={newPlayerInput}
                      onChange={e => setNewPlayerInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newPlayerInput.trim()) {
                          setMultiplayerList(prev => [...prev, newPlayerInput.trim()]);
                          setNewPlayerInput('');
                        }
                      }}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={() => {
                        if (newPlayerInput.trim()) {
                          setMultiplayerList(prev => [...prev, newPlayerInput.trim()]);
                          setNewPlayerInput('');
                        }
                      }}
                      className="bg-blue-900 text-amber-300 text-xs px-3 py-1 rounded-lg font-bold"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              )}

              {gameMode === 'team' && (
                <div className="p-3 bg-gray-50 rounded-xl space-y-2 border border-gray-200">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>Số đội thi đấu ({teams.length} đội):</span>
                    <div className="space-x-1">
                      {[2, 3, 4, 5, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => {
                            const defaultTeamColors = ['#EAB308', '#2563EB', '#DC2626', '#16A34A', '#9333EA', '#EA580C'];
                            const defaultTeamNames = ['Đội Vàng', 'Đội Xanh Lam', 'Đội Đỏ', 'Đội Xanh Lá', 'Đội Tím', 'Đội Cam'];
                            const newTeams = Array.from({ length: num }).map((_, i) => ({
                              id: `t${i + 1}`,
                              name: defaultTeamNames[i] || `Đội ${i + 1}`,
                              color: defaultTeamColors[i] || '#4B5563',
                            }));
                            setTeams(newTeams);
                          }}
                          className={`w-6 h-6 rounded text-xs font-bold ${
                            teams.length === num ? 'bg-amber-400 text-blue-950' : 'bg-white border text-gray-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {teams.map((team, idx) => (
                      <div key={team.id} className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-gray-200">
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                        <input
                          type="text"
                          value={team.name}
                          onChange={e => {
                            const val = e.target.value;
                            setTeams(prev => prev.map((t, i) => (i === idx ? { ...t, name: val } : t)));
                          }}
                          className="w-full text-xs font-bold text-gray-800 bg-transparent focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STEP 8 - PREVIEW & START */}
      {activeStepTab === 'summary' && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-blue-950 uppercase">
              Bản tóm tắt trước khi bắt đầu vòng thi
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Vui lòng rà soát lại thông tin trước khi khai mạc trò chơi trên máy chiếu
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-2xl p-5 border border-blue-100 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Khối lớp</span>
                <strong className="text-sm text-blue-950 font-black">Tin học Lớp {activeGrade}</strong>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Bộ sách</span>
                <strong className="text-sm text-blue-950 font-black truncate block">
                  {books.find(b => b.id === activeBookId)?.name || 'Kết nối tri thức'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xs col-span-2 sm:col-span-1">
                <span className="text-gray-500 block">Bài học</span>
                <strong className="text-sm text-blue-950 font-black truncate block">
                  {currentLesson?.title || 'Bài học'}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Bộ câu hỏi</span>
                <strong className="text-sm text-amber-700 font-black truncate block">
                  {currentSet?.title || 'Bộ câu hỏi'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Số câu trong lượt</span>
                <strong className="text-sm text-blue-950 font-black">
                  {selectionMode === 'manual'
                    ? `${manualSelectedIds.length} câu (Thủ công)`
                    : selectionMode === 'count'
                    ? `${Math.min(requestedCount, totalQuestionsInSet)} câu`
                    : `${totalQuestionsInSet} câu (Toàn bộ)`}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Thời gian mỗi câu</span>
                <strong className="text-sm text-blue-950 font-black">
                  {timeMode === 'global' ? `${globalTimeSeconds} giây` : 'Theo từng câu'}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Chế độ chơi</span>
                <strong className="text-sm text-indigo-900 font-black">
                  {gameMode === 'individual'
                    ? 'Cá nhân'
                    : gameMode === 'multiplayer'
                    ? `Nhiều người (${multiplayerList.length} bạn)`
                    : `Đồng đội (${teams.length} đội)`}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Trộn đề & Đáp án</span>
                <strong className="text-sm text-blue-950 font-black">
                  {shuffleQuestions ? 'Có trộn câu' : 'Giữ thứ tự'} • {shuffleOptions ? 'Trộn A/B/C/D' : 'Giữ A/B/C/D'}
                </strong>
              </div>
              <div className="p-3 bg-white rounded-xl shadow-xs">
                <span className="text-gray-500 block">Điểm mỗi câu đúng</span>
                <strong className="text-sm text-emerald-700 font-black">+{pointsPerCorrect} điểm</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setActiveStepTab('config')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-100"
            >
              ← Quay lại chỉnh sửa thiết lập
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              {onOpenShareQr && (
                <button
                  onClick={onOpenShareQr}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 border border-emerald-400 cursor-pointer"
                >
                  <QrCode className="w-5 h-5 text-amber-300" />
                  Mã QR cho học sinh quét điện thoại
                </button>
              )}
              <button
                onClick={handleStartGame}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-blue-950 font-black text-lg shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                BẮT ĐẦU VÒNG THI NGAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MODAL: NEW BOOK */}
      {showNewBookModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">Khai báo bộ sách / tài liệu mới</h3>
            <input
              type="text"
              placeholder="Nhập tên bộ sách (ví dụ: Tài liệu Tin học địa phương)..."
              value={newBookName}
              onChange={e => setNewBookName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewBookModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newBookName.trim()) {
                    createBook(newBookName.trim());
                    setNewBookName('');
                    setShowNewBookModal(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-amber-300 hover:bg-blue-800"
              >
                Lưu bộ sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MODAL: NEW LESSON */}
      {showNewLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">
              Thêm bài học mới cho Lớp {activeGrade}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Số thứ tự bài / Mã bài</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 17, 18, hoặc Bài ôn tập..."
                  value={newLessonNumber}
                  onChange={e => setNewLessonNumber(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Tên bài học</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Bài 17: Em học an toàn mạng..."
                  value={newLessonTitle}
                  onChange={e => setNewLessonTitle(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Chủ đề kiến thức</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đạo đức, pháp luật và văn hóa trong môi trường số..."
                  value={newLessonTopic}
                  onChange={e => setNewLessonTopic(e.target.value)}
                  className="w-full p-2 rounded-lg border border-gray-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewLessonModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newLessonTitle.trim()) {
                    createLesson({
                      grade: activeGrade,
                      bookId: activeBookId,
                      lessonNumber: newLessonNumber || '1',
                      title: newLessonTitle.trim(),
                      topic: newLessonTopic.trim() || 'Tin học',
                    });
                    setNewLessonTitle('');
                    setShowNewLessonModal(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 text-amber-300 hover:bg-blue-800"
              >
                Lưu bài học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK MODAL: NEW QUESTION SET */}
      {showNewSetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">
              Tạo bộ câu hỏi mới cho bài: {currentLesson?.title || ''}
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Tên bộ câu hỏi</label>
              <input
                type="text"
                placeholder="Ví dụ: Bộ câu hỏi: Khởi động & Nhận biết..."
                value={newSetTitle}
                onChange={e => setNewSetTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewSetModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (newSetTitle.trim()) {
                    createQuestionSet({
                      title: newSetTitle.trim(),
                      grade: activeGrade,
                      bookId: activeBookId,
                      lessonId: activeLessonId,
                      topic: currentLesson?.topic || 'Tin học',
                      questions: [],
                      defaultTimeSeconds: globalTimeSeconds,
                    });
                    setNewSetTitle('');
                    setShowNewSetModal(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-blue-950 hover:bg-amber-400"
              >
                Tạo bộ đề
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
