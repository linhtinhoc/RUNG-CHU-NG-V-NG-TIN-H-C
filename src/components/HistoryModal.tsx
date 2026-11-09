import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Award, Trophy, Clock, X, Calendar, User, Shield, FileSpreadsheet } from 'lucide-react';
import { GlobalLeaderboardSection } from './GlobalLeaderboardSection';

interface HistoryModalProps {
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose }) => {
  const { gameHistory, activeGrade, activeBookId, activeLessonId, activeQuestionSetId, books, lessons, questionSets } = useGame();
  const currentBook = books.find(b => b.id === activeBookId);
  const currentLesson = lessons.find(l => l.id === activeLessonId);
  const currentSet = questionSets.find(s => s.id === activeQuestionSetId);
  const [activeTab, setActiveTab] = useState<'global_leaderboard' | 'game_history'>('global_leaderboard');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-blue-950 flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-950 uppercase">
                Bảng vàng thành tích & Thống kê học sinh
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Thống kê học sinh, điểm số, huy hiệu vinh danh và xuất dữ liệu sang Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
          <button
            onClick={() => setActiveTab('global_leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'global_leaderboard'
                ? 'bg-amber-400 text-blue-950 shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Bảng vinh danh toàn cầu & Thống kê Google Sheets
          </button>

          <button
            onClick={() => setActiveTab('game_history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'game_history'
                ? 'bg-amber-400 text-blue-950 shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Lịch sử vòng thi đã đấu ({gameHistory.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'global_leaderboard' ? (
            <GlobalLeaderboardSection
              grade={activeGrade}
              bookName={currentBook?.name || 'SGK Tin học'}
              lessonTitle={currentLesson?.title || 'Bài học Tin học'}
              questionSetTitle={currentSet?.title || 'Bộ đề thi'}
              mode="individual"
            />
          ) : (
            <div className="space-y-3 text-xs">
          {gameHistory.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-600">Chưa có kết quả thi đấu nào được ghi lại.</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Hãy bắt đầu một lượt chơi để ghi danh vào Bảng vàng thành tích!
              </p>
            </div>
          ) : (
            gameHistory.map(entry => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl border border-gray-200 bg-white hover:border-amber-300 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-900 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Lớp {entry.grade}
                      </span>
                      <span className="font-extrabold text-sm text-gray-900">
                        {entry.playerNameOrWinner}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {entry.timestamp}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {entry.lessonTitle} • {entry.questionSetTitle}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-black text-amber-600">{entry.score} đ</span>
                    <span className="text-[10px] text-gray-500 block">
                      Đúng {entry.correctCount}/{entry.totalQuestions} ({entry.accuracy}%)
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-900 text-white font-bold text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
