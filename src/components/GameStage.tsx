import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameMode, GameSettings, PlayerScore, Question, TeamScore } from '../types/game';
import { GoldenBellLogo } from './GoldenBellLogo';
import { soundManager } from '../utils/soundEffects';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  LogOut,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Award,
  Users,
  Shield,
  HelpCircle,
  QrCode,
} from 'lucide-react';
import { ShareQrModal } from './ShareQrModal';

interface GameStageProps {
  questions: Question[];
  settings: GameSettings;
  lessonTitle: string;
  questionSetTitle: string;
  bookName: string;
  grade: number;
  onFinishGame: (results: {
    players: PlayerScore[];
    teams: TeamScore[];
    totalQuestions: number;
    completedQuestions: Question[];
    answersRecord: Record<string, { selectedOption: number | null; isCorrect: boolean; timeTaken: number }>;
  }) => void;
  onExitGame: () => void;
}

export const GameStage: React.FC<GameStageProps> = ({
  questions,
  settings,
  lessonTitle,
  questionSetTitle,
  bookName,
  grade,
  onFinishGame,
  onExitGame,
}) => {
  // Start countdown 3, 2, 1 state
  const [startCountdown, setStartCountdown] = useState<number | null>(3);

  // Question index
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentQuestion = questions[currentIndex];

  // Turn state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [keyboardTriggeredOption, setKeyboardTriggeredOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showShareQr, setShowShareQr] = useState(false);

  // Timer state
  const questionDuration = currentQuestion?.customTimeSeconds || settings.globalTimeSeconds || 20;
  const [remainingTime, setRemainingTime] = useState<number>(questionDuration);
  
  // Timer timestamp tracking for accurate countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<number>(Date.now());
  const timeTakenRef = useRef<number>(0);

  // Scores
  const [players, setPlayers] = useState<PlayerScore[]>(() => {
    return settings.players.map(p => ({
      id: p.id,
      name: p.name,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      answers: {},
    }));
  });

  const [teams, setTeams] = useState<TeamScore[]>(() => {
    return settings.teams.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
    }));
  });

  // Active player or team turn index
  const [activePlayerTurnIndex, setActivePlayerTurnIndex] = useState(0);
  const [selectedTeamAnswererId, setSelectedTeamAnswererId] = useState<string>(settings.teams[0]?.id || '');

  // Master records
  const [answersRecord, setAnswersRecord] = useState<Record<string, { selectedOption: number | null; isCorrect: boolean; timeTaken: number }>>({});

  // 1. Start Countdown Effect
  useEffect(() => {
    if (startCountdown === null) return;
    if (startCountdown > 0) {
      soundManager.playTick();
      const timer = setTimeout(() => {
        setStartCountdown(startCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      soundManager.playBell();
      setStartCountdown(null);
    }
  }, [startCountdown]);

  // Reset timer on question change
  useEffect(() => {
    if (startCountdown !== null) return;
    if (!currentQuestion) return;

    const initialSec = currentQuestion.customTimeSeconds || settings.globalTimeSeconds || 20;
    setRemainingTime(initialSec);
    setSelectedOption(null);
    setKeyboardTriggeredOption(null);
    setIsAnswered(false);
    setIsTimeUp(false);
    setIsPaused(false);
    lastTimestampRef.current = Date.now();
    timeTakenRef.current = 0;
  }, [currentIndex, startCountdown, currentQuestion]);

  // Handle Time Up
  const handleTimeUp = useCallback(() => {
    if (isAnswered || isTimeUp) return;
    setIsTimeUp(true);
    setIsAnswered(true);
    soundManager.playTimeUp();

    // Record as unanswered
    setAnswersRecord(prev => ({
      ...prev,
      [currentQuestion.id]: {
        selectedOption: null,
        isCorrect: false,
        timeTaken: questionDuration,
      },
    }));

    if (settings.mode === 'individual' || settings.mode === 'multiplayer') {
      setPlayers(prev =>
        prev.map((p, idx) => {
          if (idx === activePlayerTurnIndex) {
            return {
              ...p,
              unansweredCount: p.unansweredCount + 1,
            };
          }
          return p;
        })
      );
    }
  }, [isAnswered, isTimeUp, currentQuestion, questionDuration, settings.mode, activePlayerTurnIndex]);

  // 2. High-precision Timer Loop
  useEffect(() => {
    if (startCountdown !== null || isAnswered || isPaused || isTimeUp) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    lastTimestampRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;

      setRemainingTime(prev => {
        const nextTime = Math.max(0, prev - deltaSec);
        timeTakenRef.current += deltaSec;

        // Sound cues for last 5 seconds
        if (Math.ceil(nextTime) <= 5 && Math.ceil(nextTime) > 0 && Math.ceil(prev) !== Math.ceil(nextTime)) {
          soundManager.playUrgentTick();
        } else if (Math.ceil(prev) !== Math.ceil(nextTime)) {
          soundManager.playTick();
        }

        if (nextTime <= 0) {
          handleTimeUp();
          return 0;
        }
        return nextTime;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown, isAnswered, isPaused, isTimeUp, handleTimeUp]);

  // 3. User Selects Option
  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered || isTimeUp || isPaused || startCountdown !== null) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    const timeSpent = Math.min(questionDuration, Math.round(timeTakenRef.current * 10) / 10);

    if (isCorrect) {
      soundManager.playCorrect();
    } else {
      soundManager.playWrong();
    }

    // Save answer record
    setAnswersRecord(prev => ({
      ...prev,
      [currentQuestion.id]: {
        selectedOption: optionIndex,
        isCorrect,
        timeTaken: timeSpent,
      },
    }));

    // Update Scores based on mode
    if (settings.mode === 'individual' || settings.mode === 'multiplayer') {
      setPlayers(prev =>
        prev.map((player, idx) => {
          if (idx === activePlayerTurnIndex) {
            return {
              ...player,
              score: isCorrect ? player.score + settings.pointsPerCorrect : player.score + settings.pointsPerWrong,
              correctCount: isCorrect ? player.correctCount + 1 : player.correctCount,
              wrongCount: !isCorrect ? player.wrongCount + 1 : player.wrongCount,
              answers: {
                ...player.answers,
                [currentQuestion.id]: {
                  selectedOption: optionIndex,
                  isCorrect,
                  timeTaken: timeSpent,
                },
              },
            };
          }
          return player;
        })
      );
    } else if (settings.mode === 'team') {
      setTeams(prev =>
        prev.map(team => {
          if (team.id === selectedTeamAnswererId) {
            return {
              ...team,
              score: isCorrect ? team.score + settings.pointsPerCorrect : team.score + settings.pointsPerWrong,
              correctCount: isCorrect ? team.correctCount + 1 : team.correctCount,
              wrongCount: !isCorrect ? team.wrongCount + 1 : team.wrongCount,
            };
          }
          return team;
        })
      );
    }
  };

  // 4. Next Question or Finish
  const handleNextQuestion = () => {
    if (!isAnswered && !isTimeUp) {
      // Teacher clicked skip/next without answering
      handleTimeUp();
      return;
    }

    if (currentIndex + 1 < questions.length) {
      // Advance to next question
      setCurrentIndex(prev => prev + 1);

      // Rotate player turn in multiplayer
      if (settings.mode === 'multiplayer') {
        setActivePlayerTurnIndex(prev => (prev + 1) % players.length);
      }
    } else {
      // Finish Game
      soundManager.playVictory();
      onFinishGame({
        players,
        teams,
        totalQuestions: questions.length,
        completedQuestions: questions,
        answersRecord,
      });
    }
  };

  // Refs to avoid stale closures in event listeners
  const handleSelectOptionRef = useRef(handleSelectOption);
  handleSelectOptionRef.current = handleSelectOption;

  const handleNextQuestionRef = useRef(handleNextQuestion);
  handleNextQuestionRef.current = handleNextQuestion;

  const togglePauseRef = useRef(() => {
    if (!isAnswered && !isTimeUp) {
      setIsPaused(prev => !prev);
    }
  });
  togglePauseRef.current = () => {
    if (!isAnswered && !isTimeUp) {
      setIsPaused(prev => !prev);
    }
  };

  // 5. Robust Keyboard Navigation for Teachers:
  // - 'Space': Pausing / Resuming countdown
  // - '1', '2', '3', '4' (and 'A', 'B', 'C', 'D'): Selecting options
  // - 'Enter': Navigating between questions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if exit confirmation dialog is open
      if (showExitConfirm) return;

      // Do not intercept if focus is inside an active text input or textarea
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') {
        return;
      }

      // 1. 'Space' key: Pause / Resume timer
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePauseRef.current();
        return;
      }

      // 2. 'Enter' key: Navigate between questions (when answered or time is up)
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNextQuestionRef.current();
        return;
      }

      // 3. '1-4' keys (and 'A-D' / Numpad): Select corresponding option with visual confirmation
      const key = e.key.toUpperCase();
      const code = e.code;

      const triggerOptionByKeyboard = (idx: number) => {
        e.preventDefault();
        setKeyboardTriggeredOption(idx);
        handleSelectOptionRef.current(idx);
      };

      if (key === '1' || code === 'Digit1' || code === 'Numpad1' || key === 'A') {
        triggerOptionByKeyboard(0);
      } else if (key === '2' || code === 'Digit2' || code === 'Numpad2' || key === 'B') {
        triggerOptionByKeyboard(1);
      } else if (key === '3' || code === 'Digit3' || code === 'Numpad3' || key === 'C') {
        triggerOptionByKeyboard(2);
      } else if (key === '4' || code === 'Digit4' || code === 'Numpad4' || key === 'D') {
        triggerOptionByKeyboard(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExitConfirm]);

  const activePlayer = players[activePlayerTurnIndex] || players[0];
  const activeTeam = teams.find(t => t.id === selectedTeamAnswererId) || teams[0];

  const timerPercentage = Math.max(0, Math.min(100, (remainingTime / questionDuration) * 100));
  const isTimeCritical = Math.ceil(remainingTime) <= 5;

  const optionLetters = ['A', 'B', 'C', 'D'];
  const optionBgColors = [
    'from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-400',
    'from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border-emerald-400',
    'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 border-amber-400',
    'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-400',
  ];

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between bg-gradient-to-b from-blue-950 via-indigo-950 to-blue-900 text-white p-3 sm:p-6 overflow-hidden select-none">
      {/* Decorative Stage Lighting & Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HUD BAR */}
      <div className="relative z-10 max-w-7xl mx-auto w-full bg-black/40 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-amber-400/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Lesson & Topic Badge */}
        <div className="flex items-center gap-3">
          <GoldenBellLogo size="sm" animated={!isPaused} />
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-blue-950 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                Lớp {grade}
              </span>
              <span className="text-xs font-semibold text-amber-200/90 hidden sm:inline">
                {bookName}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-white truncate max-w-xs sm:max-w-md">
              {lessonTitle}
            </h2>
          </div>
        </div>

        {/* Center Progress Counter */}
        <div className="flex items-center gap-2 bg-blue-900/60 px-4 py-1.5 rounded-xl border border-blue-400/30">
          <span className="text-xs text-amber-300 font-semibold uppercase tracking-wider">Câu hỏi:</span>
          <span className="text-xl sm:text-2xl font-black text-amber-400">
            {currentIndex + 1}
          </span>
          <span className="text-sm text-amber-200/60">/ {questions.length}</span>
        </div>

        {/* Player / Team Status & Score */}
        <div className="flex items-center gap-3">
          {settings.mode === 'individual' && (
            <div className="text-right">
              <div className="text-xs text-amber-200/80 font-medium">{activePlayer.name}</div>
              <div className="text-lg sm:text-xl font-black text-yellow-300">
                {activePlayer.score} <span className="text-xs font-normal text-amber-200">điểm</span>
              </div>
            </div>
          )}

          {settings.mode === 'multiplayer' && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-400/40">
              <Users className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <span className="text-xs text-amber-300 block font-bold">Lượt: {activePlayer.name}</span>
                <span className="text-sm font-black text-yellow-300">{activePlayer.score} điểm</span>
              </div>
            </div>
          )}

          {settings.mode === 'team' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-200 hidden md:inline">Đội trả lời:</span>
              <select
                value={selectedTeamAnswererId}
                onChange={e => setSelectedTeamAnswererId(e.target.value)}
                disabled={isAnswered}
                aria-label="Chọn đội trả lời câu hỏi"
                className="bg-black/50 text-white font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl border border-amber-400/40 focus:outline-none"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.score} điểm)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Stage Controls */}
          <div className="flex items-center gap-1 pl-2 border-l border-white/20">
            <button
              onClick={() => {
                setIsPaused(true);
                setShowShareQr(true);
              }}
              aria-label="Mã QR cho học sinh"
              className="p-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white transition-colors"
              title="Chiếu mã QR cho học sinh quét tham gia (Không cần Gmail)"
            >
              <QrCode className="w-4 h-4 text-amber-300" />
            </button>
            <button
              onClick={() => setIsPaused(prev => !prev)}
              disabled={isAnswered || isTimeUp}
              aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 transition-colors disabled:opacity-40"
              title={isPaused ? 'Tiếp tục (Space)' : 'Tạm dừng (Space)'}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowExitConfirm(true)}
              aria-label="Dừng trận đấu"
              className="p-2 rounded-xl bg-red-900/50 hover:bg-red-800 text-red-200 transition-colors"
              title="Dừng trận đấu"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CENTER STAGE: QUESTION & TIMER */}
      <div className="relative z-10 max-w-5xl mx-auto w-full my-auto py-4 space-y-6">
        {/* TIMER BAR & CIRCLE */}
        <div className="flex flex-col items-center gap-2">
          {/* Circular Countdown Clock */}
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 sm:w-28 sm:h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                className="text-white/10"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                stroke="currentColor"
                strokeWidth="8"
                className={`${
                  isTimeCritical ? 'text-red-500 animate-pulse' : 'text-amber-400'
                } transition-all duration-100 ease-linear`}
                fill="transparent"
                strokeDasharray={301.6}
                strokeDashoffset={301.6 - (301.6 * timerPercentage) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-3xl sm:text-4xl font-black ${
                  isTimeCritical ? 'text-red-400 scale-110 animate-bounce' : 'text-yellow-300'
                }`}
              >
                {Math.ceil(remainingTime)}
              </span>
              <span className="text-[10px] text-amber-200/80 font-bold uppercase tracking-wider">
                Giây
              </span>
            </div>
          </div>

          {isPaused && (
            <div className="bg-amber-400 text-blue-950 px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg animate-pulse">
              ĐANG TẠM DỪNG THỜI GIAN
            </div>
          )}
        </div>

        {/* QUESTION DISPLAY BOARD */}
        <div className="bg-gradient-to-b from-blue-900/90 to-indigo-950/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border-3 border-amber-400/50 shadow-2xl relative text-center">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-400 text-blue-950 font-black text-xs px-4 py-1 rounded-full uppercase tracking-widest shadow-md">
            Câu số {currentIndex + 1}
          </div>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-relaxed mt-2 text-balance">
            {currentQuestion.content}
          </h3>

          {/* Optional illustration image if provided */}
          {currentQuestion.imageUrl && (
            <div className="my-4 max-h-48 flex justify-center">
              <img
                src={currentQuestion.imageUrl}
                alt="Hình ảnh minh họa câu hỏi"
                className="max-h-48 rounded-xl object-contain border-2 border-white/20 shadow-md"
              />
            </div>
          )}
        </div>

        {/* 4 LARGE ANSWER BUTTONS (A, B, C, D) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {currentQuestion.options.map((optionText, idx) => {
            const letter = optionLetters[idx];
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQuestion.correctAnswer;

            const isKeyboardChosen = keyboardTriggeredOption === idx;

            let buttonStyle = `bg-gradient-to-r ${optionBgColors[idx]} border-2 text-white shadow-lg transition-all duration-200 ease-out`;

            if (isAnswered || isTimeUp) {
              if (isCorrect) {
                // Correct answer is always glowing green!
                buttonStyle =
                  'bg-gradient-to-r from-emerald-500 to-green-600 border-4 border-yellow-300 text-white shadow-xl shadow-green-500/40 ring-4 ring-green-400/50 transition-all duration-200';
              } else if (isSelected && !isCorrect) {
                // Selected wrongly
                buttonStyle = 'bg-gradient-to-r from-red-600 to-rose-700 border-2 border-red-300 text-white opacity-85 transition-all duration-200';
              } else {
                // Other options fade out slightly
                buttonStyle = 'bg-black/30 border border-white/10 text-white/50 opacity-60 transition-all duration-200';
              }
            }

            // Keyboard confirmation animation and glowing ring
            if (isKeyboardChosen) {
              buttonStyle += ' animate-keyPressBounce animate-keyPressFlash ring-4 ring-amber-300 ring-offset-2 ring-offset-blue-950';
            }

            return (
              <button
                key={idx}
                disabled={isAnswered || isTimeUp || isPaused}
                onClick={() => {
                  setKeyboardTriggeredOption(null);
                  handleSelectOption(idx);
                }}
                className={`p-4 sm:p-5 rounded-2xl flex items-center gap-4 text-left transform active:scale-98 cursor-pointer disabled:cursor-default relative overflow-hidden ${buttonStyle}`}
              >
                <div
                  className={`flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-xl border flex-shrink-0 transition-transform ${
                    isKeyboardChosen
                      ? 'animate-badgePop bg-gradient-to-br from-amber-400 to-yellow-300 text-blue-950 border-white shadow-lg'
                      : 'bg-black/30 border-white/20 shadow-inner'
                  }`}
                >
                  <span
                    className={`font-black text-lg sm:text-xl leading-none ${
                      isKeyboardChosen ? 'text-blue-950 font-black' : 'text-amber-300'
                    }`}
                  >
                    {letter}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold mt-0.5 ${
                      isKeyboardChosen ? 'text-blue-900 font-black' : 'text-amber-200/70'
                    }`}
                  >
                    [{idx + 1}]
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  {currentQuestion.optionImages?.[idx] && (
                    <div className="my-1.5 max-h-28 flex items-center">
                      <img
                        src={currentQuestion.optionImages[idx]}
                        alt={`Hình ảnh phương án ${letter}`}
                        className="max-h-28 max-w-full rounded-xl object-contain bg-black/30 p-1 border border-white/25 shadow-md"
                      />
                    </div>
                  )}
                  <span className="text-base sm:text-lg font-bold leading-snug">
                    {optionText}
                  </span>
                  {isKeyboardChosen && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-300 mt-1">
                      <span>⌨️ Xác nhận từ phím</span>
                      <span className="bg-amber-400 text-blue-950 px-1.5 py-0.2 rounded font-mono font-black">
                        {idx + 1} ({letter})
                      </span>
                    </span>
                  )}
                </div>

                {isAnswered && isCorrect && (
                  <CheckCircle className="w-7 h-7 text-yellow-300 flex-shrink-0 animate-bounce" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-7 h-7 text-white flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* EXPLANATION & RESULT PANEL (Appears after answer or timeup) */}
        {(isAnswered || isTimeUp) && (
          <div className="bg-gradient-to-r from-blue-900/90 to-indigo-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-2 border-amber-400/60 shadow-xl space-y-3 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isTimeUp ? (
                  <span className="bg-orange-500 text-white font-black text-xs sm:text-sm px-3.5 py-1 rounded-full uppercase">
                    ⏰ ĐÃ HẾT GIỜ!
                  </span>
                ) : selectedOption === currentQuestion.correctAnswer ? (
                  <span className="bg-emerald-500 text-white font-black text-xs sm:text-sm px-3.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> CHÍNH XÁC! +{settings.pointsPerCorrect} ĐIỂM
                  </span>
                ) : (
                  <span className="bg-rose-600 text-white font-black text-xs sm:text-sm px-3.5 py-1 rounded-full uppercase flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> CHƯA CHÍNH XÁC
                  </span>
                )}
                <span className="text-xs sm:text-sm text-amber-300 font-bold">
                  Đáp án đúng: {optionLetters[currentQuestion.correctAnswer]}.{' '}
                  {currentQuestion.options[currentQuestion.correctAnswer]}
                </span>
              </div>

              {/* Next Question Control */}
              <button
                onClick={handleNextQuestion}
                className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-blue-950 font-black text-sm sm:text-base px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all"
              >
                <span>{currentIndex + 1 < questions.length ? 'CÂU TIẾP THEO' : 'XEM KẾT QUẢ'}</span>
                <ChevronRight className="w-5 h-5 font-black" />
              </button>
            </div>

            {/* Explanation text */}
            {currentQuestion.explanation && (
              <div className="text-xs sm:text-sm text-gray-200 bg-black/25 p-3 rounded-xl border border-white/10 leading-relaxed">
                <strong className="text-amber-300 font-bold block mb-0.5">Lời giải thích chuẩn GDPT 2018:</strong>
                {currentQuestion.explanation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM FOOTER BAR WITH HOTKEY TIPS */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pt-2 flex flex-wrap items-center justify-between text-xs text-amber-200/80">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-amber-300">Phím tắt cho giáo viên:</span>
          <span className="bg-white/10 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">1, 2, 3, 4</span>
          <span>hoặc</span>
          <span className="bg-white/10 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">A, B, C, D</span>
          <span>để chọn đáp án</span>
          <span>•</span>
          <span className="bg-white/10 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">Space</span>
          <span>để Tạm dừng / Tiếp tục</span>
          <span>•</span>
          <span className="bg-white/10 px-2 py-0.5 rounded text-amber-300 font-mono font-bold">Enter</span>
          <span>để Chuyển câu tiếp theo</span>
        </div>
        <div className="font-semibold text-amber-300/80 hidden sm:block">
          Rung Chuông Vàng – Linh Tin Học
        </div>
      </div>

      {/* 3, 2, 1 START COUNTDOWN OVERLAY */}
      {startCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-blue-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="space-y-4 text-center">
            <GoldenBellLogo size="xl" animated={true} />
            <div className="text-2xl sm:text-4xl font-extrabold text-amber-300 uppercase tracking-widest">
              Chuẩn bị bắt đầu!
            </div>
            <div className="text-7xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-500 animate-pulse drop-shadow-[0_10px_25px_rgba(245,158,11,0.6)]">
              {startCountdown === 0 ? 'BẮT ĐẦU!' : startCountdown}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM EXIT MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-blue-950 border-2 border-amber-400 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Bạn có chắc muốn thoát trò chơi?</h3>
            <p className="text-xs text-gray-300">
              Kết quả của lượt thi hiện tại sẽ không được lưu vào bảng thành tích nếu bạn thoát bây giờ.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white"
              >
                Tiếp tục chơi
              </button>
              <button
                onClick={onExitGame}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white"
              >
                Xác nhận thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE QR MODAL (CAN BE ACCESSED MID-GAME) */}
      {showShareQr && (
        <ShareQrModal onClose={() => setShowShareQr(false)} />
      )}
    </div>
  );
};
