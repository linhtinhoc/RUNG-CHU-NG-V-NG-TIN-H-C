import React, { useState, useEffect } from 'react';
import { GoldenBellLogo } from './GoldenBellLogo';
import { useGame } from '../context/GameContext';
import { Grade } from '../types/game';
import { soundManager } from '../utils/soundEffects';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Database,
  Sparkles,
  BookOpen,
  Award,
  HelpCircle,
  Gamepad2,
  QrCode,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'play' | 'bank' | 'ai' | 'history' | 'guide' | 'data' | 'share';
  setCurrentTab: (tab: 'play' | 'bank' | 'ai' | 'history' | 'guide' | 'data' | 'share') => void;
  isGameActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, isGameActive }) => {
  const { activeGrade, setActiveGrade } = useGame();
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleSound = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    soundManager.setEnabled(!nextState);
    if (!nextState) {
      soundManager.playBell();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const grades: Grade[] = [3, 4, 5];

  return (
    <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-950 text-white shadow-xl border-b-2 border-amber-400/40 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => !isGameActive && setCurrentTab('play')}
        >
          <GoldenBellLogo size="md" animated={true} />
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 drop-shadow-sm uppercase">
              RUNG CHUÔNG VÀNG – LINH TIN HỌC
            </h1>
            <p className="text-xs text-amber-200/80 font-medium hidden sm:block">
              Môn Tin học Lớp 3, 4, 5 – Chương trình GDPT 2018
            </p>
          </div>
        </div>

        {/* Grade Selector (Disabled when in middle of a game) */}
        {!isGameActive && (
          <div className="flex items-center bg-black/30 p-1 rounded-xl border border-amber-400/30">
            <span className="text-xs text-amber-300 font-semibold px-2 hidden md:inline">Khối lớp:</span>
            <div className="flex gap-1">
              {grades.map(grade => {
                const isActive = activeGrade === grade;
                return (
                  <button
                    key={grade}
                    onClick={() => {
                      setActiveGrade(grade);
                      soundManager.playTick();
                    }}
                    className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-blue-950 shadow-md shadow-amber-500/30 scale-105'
                        : 'text-amber-100/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Lớp {grade}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isGameActive && (
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setCurrentTab('play')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'play'
                    ? 'bg-amber-400 text-blue-950 font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Bắt đầu thi đấu"
              >
                <Gamepad2 className="w-4 h-4" />
                <span className="hidden lg:inline">Trò chơi</span>
              </button>

              <button
                onClick={() => setCurrentTab('share')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  currentTab === 'share'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-blue-950'
                    : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
                }`}
                title="Mã QR & Link cho học sinh quét điện thoại tham gia (Không cần Gmail)"
              >
                <QrCode className="w-4 h-4 text-amber-300" />
                <span>Mã QR</span>
              </button>

              <button
                onClick={() => setCurrentTab('bank')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'bank'
                    ? 'bg-amber-400 text-blue-950 font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Quản lý ngân hàng câu hỏi"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden lg:inline">Ngân hàng</span>
              </button>

              <button
                onClick={() => setCurrentTab('ai')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'ai'
                    ? 'bg-amber-400 text-blue-950 font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Tạo câu hỏi bằng AI"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="hidden lg:inline">Tạo bằng AI</span>
              </button>

              <button
                onClick={() => setCurrentTab('history')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'history'
                    ? 'bg-amber-400 text-blue-950 font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Bảng thành tích thi đấu"
              >
                <Award className="w-4 h-4" />
                <span className="hidden xl:inline">Thành tích</span>
              </button>

              <button
                onClick={() => setCurrentTab('guide')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'guide'
                    ? 'bg-amber-400 text-blue-950 font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Hướng dẫn sử dụng cho giáo viên"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden xl:inline">Hướng dẫn</span>
              </button>

              <button
                onClick={() => setCurrentTab('data')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === 'data'
                    ? 'bg-amber-400 text-blue-950 font-bold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
                title="Nhập / Xuất và Sao lưu dữ liệu"
              >
                <Database className="w-4 h-4" />
                <span className="hidden xl:inline">Dữ liệu</span>
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="p-2 rounded-lg bg-black/30 hover:bg-white/20 text-amber-300 transition-colors border border-amber-400/20"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Thu nhỏ màn hình' : 'Toàn màn hình máy chiếu'}
            className="p-2 rounded-lg bg-black/30 hover:bg-white/20 text-amber-300 transition-colors border border-amber-400/20"
            title={isFullscreen ? 'Thu nhỏ màn hình' : 'Toàn màn hình máy chiếu'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
