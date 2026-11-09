import React from 'react';
import { useGame } from '../context/GameContext';
import { Award, Trophy, Clock, X, Calendar, User, Shield } from 'lucide-react';

interface HistoryModalProps {
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose }) => {
  const { gameHistory } = useGame();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-blue-950 flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-950 uppercase">
                Bảng vàng thành tích Rung Chuông Vàng
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Ghi nhận kết quả các vòng thi đấu của học sinh và các đội
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

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
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
