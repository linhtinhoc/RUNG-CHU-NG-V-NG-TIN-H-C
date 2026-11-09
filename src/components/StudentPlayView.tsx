import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { GoldenBellLogo } from './GoldenBellLogo';
import { Question } from '../types/game';
import { soundManager } from '../utils/soundEffects';
import { calculateRankAndTitle } from '../utils/gameRules';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Send,
  Loader2,
  Volume2,
  VolumeX,
  FileText,
  User,
} from 'lucide-react';

interface StudentPlayViewProps {
  initialRoomCode?: string;
  onExit: () => void;
}

export const StudentPlayView: React.FC<StudentPlayViewProps> = ({ initialRoomCode, onExit }) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Student details
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  // Playing state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(20);
  const [isMuted, setIsMuted] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Scoring
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answersRecord, setAnswersRecord] = useState<
    Array<{ question: Question; selectedOption: number | null; isCorrect: boolean }>
  >([]);

  // Finish state
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch session data by room code
  const fetchSession = async (code: string) => {
    if (!code || !code.trim()) return;
    setIsLoadingSession(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/game-session/${code.trim()}`);
      const data = await res.json();

      if (data.success && data.session) {
        setSessionData(data.session);
        setRemainingTime(data.session.defaultTimeSeconds || 20);
      } else {
        setErrorMessage(data.message || 'Không tìm thấy phòng thi. Hãy kiểm tra lại mã số.');
      }
    } catch (err: any) {
      setErrorMessage('Lỗi kết nối tới máy chủ phòng thi. Vui lòng thử lại.');
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    if (initialRoomCode) {
      fetchSession(initialRoomCode);
    }
  }, [initialRoomCode]);

  // Questions from session
  const questions: Question[] = sessionData?.questions || [];
  const currentQuestion = questions[currentIndex];
  const questionDuration = currentQuestion?.customTimeSeconds || sessionData?.defaultTimeSeconds || 20;

  // Question Timer
  useEffect(() => {
    if (!hasStarted || isFinished || !currentQuestion || isAnswered || isTimeUp) return;

    setRemainingTime(questionDuration);

    timerRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        if (prev <= 5 && !isMuted) {
          soundManager.playUrgentTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, currentIndex, isAnswered, isTimeUp, isFinished]);

  const handleTimeUp = () => {
    setIsTimeUp(true);
    setIsAnswered(true);
    if (!isMuted) soundManager.playWrong();

    setWrongCount(prev => prev + 1);
    setAnswersRecord(prev => [
      ...prev,
      { question: currentQuestion, selectedOption: null, isCorrect: false },
    ]);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered || isTimeUp) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQuestion.correctAnswer;
    if (isCorrect) {
      if (!isMuted) soundManager.playCorrect();
      setCorrectCount(prev => prev + 1);
      setScore(prev => prev + 10);
    } else {
      if (!isMuted) soundManager.playWrong();
      setWrongCount(prev => prev + 1);
    }

    setAnswersRecord(prev => [
      ...prev,
      { question: currentQuestion, selectedOption: idx, isCorrect },
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsTimeUp(false);
      setRemainingTime(questionDuration);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    setIsFinished(true);
    if (!isMuted) soundManager.playVictory();

    // Trigger fireworks/confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    // Auto submit to teacher's session
    submitScore();
  };

  const submitScore = async () => {
    if (!sessionData?.roomCode || hasSubmitted) return;
    setIsSubmitting(true);

    try {
      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      
      const correctList: number[] = [];
      const wrongList: number[] = [];
      answersRecord.forEach((record, idx) => {
        if (record.isCorrect) {
          correctList.push(idx + 1);
        } else {
          wrongList.push(idx + 1);
        }
      });

      const correctDetails = correctList.length > 0 ? correctList.join(', ') : '0';
      const wrongDetails = wrongList.length > 0 ? wrongList.join(', ') : '0';

      await fetch(`/api/game-session/${sessionData.roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName || 'Học sinh',
          studentClass: studentClass || '',
          score: score,
          correctCount: correctCount,
          wrongCount: wrongCount,
          totalQuestions: questions.length,
          correctDetails,
          wrongDetails,
          timeTakenSeconds: elapsedSeconds,
        }),
      });
      setHasSubmitted(true);
    } catch (err) {
      console.warn('Could not submit score:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];
  const rankInfo = calculateRankAndTitle(correctCount, questions.length);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-slate-950 text-white font-sans flex flex-col justify-between">
      {/* Top Mobile Bar */}
      <header className="px-4 py-3 bg-black/40 border-b border-amber-400/30 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <GoldenBellLogo size="sm" animated={true} />
          <div>
            <span className="font-black text-sm text-amber-300 block leading-tight uppercase">
              RUNG CHUÔNG VÀNG
            </span>
            <span className="text-[10px] text-amber-200/80 font-medium">LINH TIN HỌC</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundManager.setEnabled(!next);
            }}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300"
            title="Bật/Tắt âm thanh"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onExit}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-300"
          >
            Thoát
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center p-3 sm:p-5 max-w-xl w-full mx-auto">
        {/* PHASE 1: ENTER ROOM CODE OR WAITING */}
        {!sessionData && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 border-amber-400/50 shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-blue-950 mx-auto flex items-center justify-center shadow-lg">
              <Bell className="w-8 h-8 animate-bounce" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-yellow-300 uppercase">
                Vào Phòng Thi Rung Chuông Vàng
              </h2>
              <p className="text-xs text-amber-200/80 mt-1">
                Nhập mã phòng 6 chữ số do thầy cô giáo cung cấp
              </p>
            </div>

            <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-[11px] text-emerald-300 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Không yêu cầu Gmail hay đăng nhập tài khoản Google</span>
            </div>

            <div className="space-y-3 pt-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Ví dụ: 582914"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full text-center text-3xl font-mono font-black tracking-widest p-3 bg-white text-blue-950 rounded-2xl border-2 border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-400/50 uppercase shadow-inner"
              />

              {errorMessage && (
                <div className="text-xs text-red-400 font-bold bg-red-950/50 p-2 rounded-xl border border-red-500/50">
                  {errorMessage}
                </div>
              )}

              <button
                onClick={() => fetchSession(roomCode)}
                disabled={isLoadingSession || roomCode.length < 4}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-blue-950 font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isLoadingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tìm phòng thi...
                  </>
                ) : (
                  'Tìm Phòng Thi'
                )}
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: NAME ENTRY & READY */}
        {sessionData && !hasStarted && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 border-amber-400/50 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
                Tin học Lớp {sessionData.grade} • {sessionData.bookName}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white pt-2 leading-snug">
                {sessionData.lessonTitle}
              </h2>
              <p className="text-xs text-amber-200">
                Bộ đề: "{sessionData.questionSetTitle}" ({questions.length} câu • {sessionData.defaultTimeSeconds}s/câu)
              </p>
            </div>

            <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Em hãy nhập họ tên của mình để kết quả tự động hiển thị trên bảng thi của thầy cô.</span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1.5">
                  Họ và tên của em (*):
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn An"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 rounded-2xl bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-amber-400 shadow-md"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-amber-300 block">
                    Lớp của em:
                  </label>
                  <span className="text-[10px] text-amber-200/80">Chọn nhanh hoặc tự nhập</span>
                </div>
                <input
                  type="text"
                  placeholder="Ví dụ: 3A, 4B, 5C"
                  value={studentClass}
                  onChange={e => setStudentClass(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white text-gray-900 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-amber-400 shadow-md uppercase"
                />
                {/* Quick Class Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    `${sessionData.grade || 3}A`,
                    `${sessionData.grade || 3}B`,
                    `${sessionData.grade || 3}C`,
                    `${sessionData.grade || 3}D`,
                    '3A', '3B', '4A', '4B', '5A', '5B'
                  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6).map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setStudentClass(cls)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        studentClass === cls
                          ? 'bg-amber-400 text-blue-950 shadow-md font-black'
                          : 'bg-white/10 text-gray-200 hover:bg-white/20'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!studentName.trim()) {
                    setStudentName('Học sinh thông thái');
                  }
                  startTimeRef.current = Date.now();
                  setHasStarted(true);
                  if (!isMuted) soundManager.playBell();
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-blue-950 font-black text-base uppercase tracking-wider shadow-2xl flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer mt-2"
              >
                <Sparkles className="w-5 h-5" />
                VÀO THI RUNG CHUÔNG VÀNG
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: PLAYING QUIZ */}
        {hasStarted && !isFinished && currentQuestion && (
          <div className="space-y-4">
            {/* Question Header & Countdown */}
            <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-amber-400/30">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-300 text-sm">
                  Câu {currentIndex + 1} / {questions.length}
                </span>
                <span className="text-[10px] text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
                  Điểm: {score}
                </span>
              </div>

              {/* Timer Pill */}
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full font-mono font-black text-xs ${
                  remainingTime <= 5 ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-400 text-blue-950'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{remainingTime}s</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-gradient-to-b from-blue-900/90 to-indigo-950/95 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border-2 border-amber-400/50 shadow-2xl text-center space-y-3">
              <h3 className="text-base sm:text-lg font-extrabold text-white leading-relaxed">
                {currentQuestion.content}
              </h3>

              {/* Question Image if provided */}
              {currentQuestion.imageUrl && (
                <div className="my-2 max-h-44 flex justify-center">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Ảnh câu hỏi"
                    className="max-h-44 rounded-xl object-contain border border-white/20 shadow-md bg-black/20 p-1"
                  />
                </div>
              )}
            </div>

            {/* 4 Large Touch Option Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {currentQuestion.options.map((optText, optIdx) => {
                const letter = optionLetters[optIdx];
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === currentQuestion.correctAnswer;

                let btnBg = 'bg-white/10 hover:bg-white/20 border-white/20 text-white';
                if (isAnswered || isTimeUp) {
                  if (isCorrect) {
                    btnBg = 'bg-emerald-600 border-yellow-300 text-white ring-4 ring-emerald-400/50';
                  } else if (isSelected && !isCorrect) {
                    btnBg = 'bg-red-600 border-red-300 text-white';
                  } else {
                    btnBg = 'bg-black/30 border-white/10 text-white/40';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswered || isTimeUp}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer disabled:cursor-default ${btnBg}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center flex-shrink-0 ${
                        isAnswered && isCorrect
                          ? 'bg-yellow-300 text-blue-950'
                          : 'bg-black/40 text-amber-300 border border-white/20'
                      }`}
                    >
                      {letter}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      {currentQuestion.optionImages?.[optIdx] && (
                        <div className="mb-1 max-h-20 flex items-center">
                          <img
                            src={currentQuestion.optionImages[optIdx]}
                            alt={`Ảnh ${letter}`}
                            className="max-h-20 rounded-lg object-contain bg-black/30 p-1 border border-white/20"
                          />
                        </div>
                      )}
                      <span className="text-xs sm:text-sm font-bold leading-snug">{optText}</span>
                    </div>

                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-yellow-300 flex-shrink-0 animate-bounce" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-white flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Next button */}
            {isAnswered && (
              <div className="space-y-3 pt-1">
                {currentQuestion.explanation && (
                  <div className="bg-amber-400/20 border border-amber-400/40 p-3 rounded-2xl text-xs text-amber-200">
                    <strong>Giải thích:</strong> {currentQuestion.explanation}
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-blue-950 font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{currentIndex + 1 < questions.length ? 'Câu tiếp theo' : 'Xem Kết Quả'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* PHASE 4: RESULTS & CERTIFICATE */}
        {isFinished && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 border-amber-400/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-blue-950 mx-auto flex items-center justify-center shadow-2xl">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">
                {rankInfo.title}
              </span>
              <h2 className="text-2xl font-black text-yellow-300 mt-1">
                {studentName || 'Học sinh'}
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">{rankInfo.message}</p>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-black/40 rounded-2xl border border-white/10">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Tổng điểm</span>
                <span className="text-2xl font-black text-amber-300">{score} điểm</span>
              </div>
              <div className="p-3 bg-black/40 rounded-2xl border border-white/10">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Câu trả lời đúng</span>
                <span className="text-2xl font-black text-emerald-400">
                  {correctCount} / {questions.length}
                </span>
              </div>
            </div>

            {/* Submission Status */}
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Kết quả đã được ghi nhận tự động vào bảng thi của thầy cô!</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => setShowReview(true)}
                className="w-full py-2.5 rounded-xl border border-amber-400/50 bg-white/5 hover:bg-white/10 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Xem lại toàn bộ đáp án & lời giải
              </button>

              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setSelectedOption(null);
                  setIsAnswered(false);
                  setIsTimeUp(false);
                  setIsFinished(false);
                  setScore(0);
                  setCorrectCount(0);
                  setWrongCount(0);
                  setAnswersRecord([]);
                  setHasStarted(true);
                }}
                className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-blue-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow"
              >
                <RotateCcw className="w-4 h-4" />
                Làm Lại Bài Thi
              </button>
            </div>
          </div>
        )}

        {/* REVIEW ANSWERS MODAL */}
        {showReview && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col border border-white/20">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-base text-yellow-300 uppercase">
                  Đáp Án Chi Tiết Của Em
                </h3>
                <button
                  onClick={() => setShowReview(false)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {answersRecord.map((rec, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-2xl border ${
                      rec.isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : 'bg-red-950/40 border-red-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-bold text-white">
                        Câu {i + 1}: {rec.question.content}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          rec.isCorrect ? 'bg-emerald-500 text-blue-950' : 'bg-red-500 text-white'
                        }`}
                      >
                        {rec.isCorrect ? 'ĐÚNG' : 'SAI'}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-300 space-y-0.5">
                      <div>
                        Phương án em chọn:{' '}
                        <strong>
                          {rec.selectedOption !== null
                            ? `${optionLetters[rec.selectedOption]}. ${rec.question.options[rec.selectedOption]}`
                            : 'Hết giờ (Chưa chọn)'}
                        </strong>
                      </div>
                      <div>
                        Đáp án đúng:{' '}
                        <strong className="text-yellow-300">
                          {optionLetters[rec.question.correctAnswer]}.{' '}
                          {rec.question.options[rec.question.correctAnswer]}
                        </strong>
                      </div>
                      {rec.question.explanation && (
                        <div className="text-gray-400 italic pt-1">
                          Lời giải: {rec.question.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowReview(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="p-3 text-center text-[11px] text-gray-400">
        Rung Chuông Vàng – Môn Tin học GDPT 2018 • Dành cho học sinh
      </footer>
    </div>
  );
};
