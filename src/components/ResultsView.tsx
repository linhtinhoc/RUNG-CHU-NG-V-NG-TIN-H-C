import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameMode, PlayerScore, Question, TeamScore } from '../types/game';
import { calculateRankAndTitle, sortLeaderboard } from '../utils/gameRules';
import { GoldenBellLogo } from './GoldenBellLogo';
import { soundManager } from '../utils/soundEffects';
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  BookOpen,
  Home,
  Eye,
  Trophy,
  Users,
  Shield,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ResultsViewProps {
  results: {
    players: PlayerScore[];
    teams: TeamScore[];
    totalQuestions: number;
    completedQuestions: Question[];
    answersRecord: Record<string, { selectedOption: number | null; isCorrect: boolean; timeTaken: number }>;
  };
  grade: number;
  bookName: string;
  lessonTitle: string;
  questionSetTitle: string;
  mode: GameMode;
  onPlayAgain: () => void;
  onChangeSet: () => void;
  onChangeLesson: () => void;
  onGoHome: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  grade,
  bookName,
  lessonTitle,
  questionSetTitle,
  mode,
  onPlayAgain,
  onChangeSet,
  onChangeLesson,
  onGoHome,
}) => {
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Compute aggregate stats for individual or winning player
  const sortedPlayers = sortLeaderboard(results.players);
  const topPlayer = sortedPlayers[0] || {
    name: 'Học sinh',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    unansweredCount: 0,
  };

  const sortedTeams = [...results.teams].sort((a, b) => b.score - a.score);
  const winningTeam = sortedTeams[0];

  const primaryScore = mode === 'team' ? winningTeam?.score || 0 : topPlayer.score;
  const primaryCorrect = mode === 'team' ? winningTeam?.correctCount || 0 : topPlayer.correctCount;
  const primaryWrong = mode === 'team' ? winningTeam?.wrongCount || 0 : topPlayer.wrongCount;
  const primaryUnanswered = mode === 'team' ? winningTeam?.unansweredCount || 0 : topPlayer.unansweredCount;

  const totalQuestions = results.totalQuestions;
  const accuracy = totalQuestions > 0 ? Math.round((primaryCorrect / totalQuestions) * 100) : 0;

  const { title, message, stars, badgeColor } = calculateRankAndTitle(primaryCorrect, totalQuestions);

  // Fire celebratory confetti on mount if score is good!
  useEffect(() => {
    soundManager.playVictory();
    if (accuracy >= 50) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#FBBF24', '#3B82F6', '#10B981', '#EC4899'],
        });
      } catch {}
    }
  }, [accuracy]);

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Grand Title Banner */}
      <div className="bg-gradient-to-br from-blue-950 via-indigo-900 to-amber-950 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl border-4 border-amber-400 relative overflow-hidden">
        <div className="flex justify-center mb-4">
          <GoldenBellLogo size="xl" animated={true} />
        </div>

        <div className="inline-block bg-amber-400 text-blue-950 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md mb-3">
          TỔNG KẾT VÒNG THI RUNG CHUÔNG VÀNG
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 uppercase tracking-tight">
          {title}
        </h1>

        {/* Stars */}
        <div className="flex justify-center gap-1.5 my-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-7 h-7 ${
                i < stars ? 'text-amber-400 fill-amber-400 drop-shadow-md' : 'text-gray-600'
              }`}
            />
          ))}
        </div>

        <p className="text-base sm:text-lg text-amber-200 font-semibold max-w-xl mx-auto mt-2">
          {message}
        </p>

        {/* Curriculum Breadcrumb */}
        <div className="text-xs text-amber-300/80 font-medium mt-4 pt-3 border-t border-white/10">
          Tin học Lớp {grade} • {bookName} • {lessonTitle} • {questionSetTitle}
        </div>
      </div>

      {/* SCORE CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Tổng điểm đạt được
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-600">{primaryScore}</div>
          <span className="text-xs text-gray-400">điểm</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Số câu trả lời đúng
          </span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600">
            {primaryCorrect} <span className="text-base font-bold text-gray-400">/ {totalQuestions}</span>
          </div>
          <span className="text-xs text-emerald-700 font-semibold">Tỉ lệ {accuracy}%</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Số câu trả lời sai
          </span>
          <div className="text-3xl sm:text-4xl font-black text-rose-600">{primaryWrong}</div>
          <span className="text-xs text-gray-400">câu</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">
            Hết giờ / Chưa trả lời
          </span>
          <div className="text-3xl sm:text-4xl font-black text-orange-500">{primaryUnanswered}</div>
          <span className="text-xs text-gray-400">câu</span>
        </div>
      </div>

      {/* MULTIPLAYER LEADERBOARD */}
      {mode === 'multiplayer' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-base text-gray-900">Bảng xếp hạng cá nhân</h3>
          </div>
          <div className="space-y-2">
            {sortedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  idx === 0
                    ? 'border-amber-400 bg-amber-50/70 font-bold'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0
                        ? 'bg-amber-400 text-blue-950'
                        : idx === 1
                        ? 'bg-gray-300 text-gray-800'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-gray-900">{player.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-emerald-700 font-semibold">{player.correctCount} đúng</span>
                  <span className="text-sm font-black text-amber-600">{player.score} điểm</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAM MATCH SCORES */}
      {mode === 'team' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-base text-gray-900">Kết quả thi đấu theo đội</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sortedTeams.map((team, idx) => (
              <div
                key={team.id}
                className={`p-4 rounded-xl border-2 space-y-2 ${
                  idx === 0
                    ? 'border-amber-500 bg-amber-50/60 shadow-md'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="font-extrabold text-sm text-gray-900">{team.name}</span>
                  </div>
                  {idx === 0 && (
                    <span className="text-[10px] bg-amber-400 text-blue-950 font-black px-2 py-0.5 rounded-full uppercase">
                      Hạng 1
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-gray-500">{team.correctCount} câu đúng</span>
                  <span className="text-2xl font-black text-blue-950">{team.score} đ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={() => setShowReviewModal(true)}
          className="px-5 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-amber-300 font-bold text-sm flex items-center gap-2 shadow"
        >
          <Eye className="w-4 h-4" />
          Xem lại đáp án chi tiết
        </button>

        <button
          onClick={onPlayAgain}
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-blue-950 font-black text-sm flex items-center gap-2 shadow"
        >
          <RotateCcw className="w-4 h-4" />
          Chơi lại lượt này
        </button>

        <button
          onClick={onChangeSet}
          className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm flex items-center gap-1.5"
        >
          <BookOpen className="w-4 h-4" />
          Chọn bộ câu hỏi khác
        </button>

        <button
          onClick={onChangeLesson}
          className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm flex items-center gap-1.5"
        >
          Chọn bài học khác
        </button>

        <button
          onClick={onGoHome}
          className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-sm flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          Trang chủ
        </button>
      </div>

      {/* ANSWER REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-blue-950 uppercase">
                  Bảng tra cứu & Lời giải thích đáp án
                </h3>
                <p className="text-xs text-gray-500">
                  Đối chiếu lựa chọn của học sinh với đáp án chuẩn SGK Tin học GDPT 2018
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {results.completedQuestions.map((q, idx) => {
                const record = results.answersRecord[q.id];
                const selected = record?.selectedOption;
                const isCorrect = record?.isCorrect ?? false;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border-2 ${
                      isCorrect ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-extrabold text-sm text-gray-900">
                        Câu {idx + 1}: {q.content}
                      </span>
                      {isCorrect ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                          <XCircle className="w-3.5 h-3.5" /> Chưa đúng
                        </span>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrectOption = optIdx === q.correctAnswer;
                        const isChosenOption = selected === optIdx;

                        let optClass = 'bg-white text-gray-700 border-gray-200';
                        if (isCorrectOption) {
                          optClass = 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold';
                        } else if (isChosenOption && !isCorrectOption) {
                          optClass = 'bg-rose-100 text-rose-900 border-rose-300 line-through';
                        }

                        return (
                          <div key={optIdx} className={`p-2.5 rounded-xl border flex items-center gap-2 ${optClass}`}>
                            <span className="font-black">{optionLetters[optIdx]}.</span>
                            <span>{opt}</span>
                            {isCorrectOption && <span className="ml-auto text-emerald-700 font-black">✓ Đúng</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="text-xs text-gray-700 bg-white/80 p-2.5 rounded-xl border border-gray-200 leading-relaxed">
                        <strong className="text-blue-900">Giải thích: </strong>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-900 text-white font-bold text-xs"
              >
                Đóng bảng tra cứu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
