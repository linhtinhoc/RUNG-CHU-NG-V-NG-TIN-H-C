import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/Header';
import { LobbyView } from './components/LobbyView';
import { GameStage } from './components/GameStage';
import { ResultsView } from './components/ResultsView';
import { QuestionBankModal } from './components/QuestionBankModal';
import { AiGeneratorModal } from './components/AiGeneratorModal';
import { TeacherGuideModal } from './components/TeacherGuideModal';
import { ImportExportModal } from './components/ImportExportModal';
import { HistoryModal } from './components/HistoryModal';
import { ShareQrModal } from './components/ShareQrModal';
import { StudentPlayView } from './components/StudentPlayView';
import { GameMode, GameSettings, PlayerScore, Question, TeamScore } from './types/game';
import { filterAndPrepareQuestions } from './utils/gameRules';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function AppContent() {
  const {
    books,
    lessons,
    questionSets,
    activeGrade,
    activeBookId,
    activeLessonId,
    activeQuestionSetId,
    toasts,
    removeToast,
    saveGameHistory,
  } = useGame();

  // Student QR Mode detection (?code=... or ?join=1)
  const [isStudentMode, setIsStudentMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('join') === '1' || !!params.get('code');
  });
  const [studentRoomCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('code') || '';
  });

  // Screen State: 'lobby' | 'playing' | 'results'
  const [screen, setScreen] = useState<'lobby' | 'playing' | 'results'>('lobby');

  // Modals
  const [activeModal, setActiveModal] = useState<'bank' | 'ai' | 'guide' | 'data' | 'history' | 'share' | null>(null);

  // Active Game State
  const [activeGameSettings, setActiveGameSettings] = useState<GameSettings | null>(null);
  const [activeGameQuestions, setActiveGameQuestions] = useState<Question[]>([]);
  const [gameResults, setGameResults] = useState<{
    players: PlayerScore[];
    teams: TeamScore[];
    totalQuestions: number;
    completedQuestions: Question[];
    answersRecord: Record<string, { selectedOption: number | null; isCorrect: boolean; timeTaken: number }>;
  } | null>(null);

  // Autostart URL parameter support for automated testing & quick demo
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const targetSet = questionSets.find(s => s.id === activeQuestionSetId) || questionSets[0];
      if (targetSet && targetSet.questions.length > 0) {
        const defaultSettings: GameSettings = {
          mode: 'individual',
          timeMode: 'global',
          globalTimeSeconds: 20,
          questionCount: Math.min(5, targetSet.questions.length),
          selectedQuestionIds: targetSet.questions.map(q => q.id),
          selectionMode: 'count',
          difficultyFilter: 'all',
          topicFilter: 'all',
          shuffleQuestions: false,
          shuffleOptions: false,
          pointsPerCorrect: 10,
          pointsPerWrong: 0,
          pointsPerSkip: 0,
          enableAudio: false,
          enableAnimation: false,
          enableConfetti: false,
          players: [{ id: 'p1', name: 'Thí sinh Thử Nghiệm' }],
          teams: [],
        };
        const prepared = filterAndPrepareQuestions(targetSet, defaultSettings);
        setActiveGameSettings(defaultSettings);
        setActiveGameQuestions(prepared);
        setScreen('playing');
      }
    }
  }, []);

  const currentBook = books.find(b => b.id === activeBookId);
  const currentLesson = lessons.find(l => l.id === activeLessonId);
  const currentSet = questionSets.find(s => s.id === activeQuestionSetId);

  // Start Game handler
  const handleStartGame = (settings: GameSettings) => {
    if (!currentSet) return;
    const prepared = filterAndPrepareQuestions(currentSet, settings);
    setActiveGameSettings(settings);
    setActiveGameQuestions(prepared);
    setScreen('playing');
  };

  // Finish Game handler
  const handleFinishGame = (results: {
    players: PlayerScore[];
    teams: TeamScore[];
    totalQuestions: number;
    completedQuestions: Question[];
    answersRecord: Record<string, { selectedOption: number | null; isCorrect: boolean; timeTaken: number }>;
  }) => {
    setGameResults(results);
    setScreen('results');

    // Record into history
    const isTeam = activeGameSettings?.mode === 'team';
    let topName = 'Học sinh';
    let topScore = 0;
    let correctCount = 0;
    let wrongCount = 0;

    if (isTeam) {
      const topTeam = [...results.teams].sort((a, b) => b.score - a.score)[0];
      topName = topTeam ? topTeam.name : 'Đội thi đấu';
      topScore = topTeam?.score || 0;
      correctCount = topTeam?.correctCount || 0;
      wrongCount = topTeam?.wrongCount || 0;
    } else {
      const topP = [...results.players].sort((a, b) => b.score - a.score)[0];
      topName = topP ? topP.name : 'Học sinh';
      topScore = topP?.score || 0;
      correctCount = topP?.correctCount || 0;
      wrongCount = topP?.wrongCount || 0;
    }

    saveGameHistory({
      grade: activeGrade,
      bookName: currentBook?.name || 'Tin học',
      lessonTitle: currentLesson?.title || 'Bài học',
      questionSetTitle: currentSet?.title || 'Bộ đề',
      mode: activeGameSettings?.mode || 'individual',
      totalQuestions: results.totalQuestions,
      score: topScore,
      correctCount,
      wrongCount,
      accuracy: results.totalQuestions > 0 ? Math.round((correctCount / results.totalQuestions) * 100) : 0,
      playerNameOrWinner: topName,
    });
  };

  // Play Again with exact same settings
  const handlePlayAgain = () => {
    if (!currentSet || !activeGameSettings) return;
    const prepared = filterAndPrepareQuestions(currentSet, activeGameSettings);
    setActiveGameQuestions(prepared);
    setScreen('playing');
  };

  // If student joined via QR code or shared link (?code=... or ?join=1)
  if (isStudentMode) {
    return (
      <StudentPlayView
        initialRoomCode={studentRoomCode}
        onExit={() => {
          setIsStudentMode(false);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-gray-900">
      {/* Toast Notifications */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl flex items-start gap-2.5 text-xs font-bold border transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-white border-emerald-400'
                : toast.type === 'error'
                ? 'bg-red-900/95 text-white border-red-400'
                : 'bg-blue-950/95 text-amber-200 border-amber-400/50'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />}
            <span className="flex-1 leading-snug">{toast.text}</span>
            <button onClick={() => removeToast(toast.id)} className="text-white/60 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Header */}
      <Header
        currentTab={activeModal || (screen === 'lobby' ? 'play' : 'play')}
        setCurrentTab={tab => {
          if (tab === 'play') {
            setActiveModal(null);
            setScreen('lobby');
          } else {
            setActiveModal(tab);
          }
        }}
        isGameActive={screen === 'playing'}
      />

      {/* Main Body */}
      <main className="flex-1">
        {screen === 'lobby' && (
          <LobbyView
            onStartGame={handleStartGame}
            onOpenQuestionBank={() => setActiveModal('bank')}
            onOpenAiGenerator={() => setActiveModal('ai')}
            onOpenGuide={() => setActiveModal('guide')}
            onOpenShareQr={() => setActiveModal('share')}
          />
        )}

        {screen === 'playing' && activeGameSettings && (
          <GameStage
            questions={activeGameQuestions}
            settings={activeGameSettings}
            lessonTitle={currentLesson?.title || 'Bài học Tin học'}
            questionSetTitle={currentSet?.title || 'Bộ câu hỏi'}
            bookName={currentBook?.name || 'SGK Tin học'}
            grade={activeGrade}
            onFinishGame={handleFinishGame}
            onExitGame={() => setScreen('lobby')}
          />
        )}

        {screen === 'results' && gameResults && activeGameSettings && (
          <ResultsView
            results={gameResults}
            grade={activeGrade}
            bookName={currentBook?.name || 'SGK Tin học'}
            lessonTitle={currentLesson?.title || 'Bài học'}
            questionSetTitle={currentSet?.title || 'Bộ đề'}
            mode={activeGameSettings.mode}
            onPlayAgain={handlePlayAgain}
            onChangeSet={() => {
              setScreen('lobby');
              setActiveModal('bank');
            }}
            onChangeLesson={() => setScreen('lobby')}
            onGoHome={() => setScreen('lobby')}
          />
        )}
      </main>

      {/* MODALS */}
      {activeModal === 'bank' && <QuestionBankModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'ai' && <AiGeneratorModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'guide' && <TeacherGuideModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'data' && <ImportExportModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'history' && <HistoryModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'share' && <ShareQrModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
