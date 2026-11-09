import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Copy,
  Check,
  Download,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Trash2,
  Code,
  HelpCircle,
  Clock,
  X,
  FileSpreadsheet,
  Users,
} from 'lucide-react';
import {
  GlobalLeaderboardEntry,
  getLocalLeaderboard,
  saveLocalLeaderboard,
  formatVietnameseTimestamp,
  parseVietnameseName,
  assignFunBadge,
} from '../utils/leaderboard';
import {
  formatForGoogleSheetsClipboard,
  generateGoogleSheetsCsv,
  downloadCsvFile,
  getGoogleAppsScriptTemplate,
  GOOGLE_SHEETS_COLUMNS,
} from '../utils/googleSheetsExport';
import { GameMode, PlayerScore, Question, TeamScore } from '../types/game';

interface GlobalLeaderboardSectionProps {
  currentSessionResults?: {
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
}

export const GlobalLeaderboardSection: React.FC<GlobalLeaderboardSectionProps> = ({
  currentSessionResults,
  grade,
  lessonTitle,
  questionSetTitle,
  mode,
}) => {
  // Tab: 'current' (current session) vs 'global' (all sessions)
  const [activeTab, setActiveTab] = useState<'all' | 'current'>('all');
  
  // Data state
  const [entries, setEntries] = useState<GlobalLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<string>('all');

  // Convert current session results into GlobalLeaderboardEntry items
  const currentSessionEntries = useMemo<GlobalLeaderboardEntry[]>(() => {
    if (!currentSessionResults) return [];

    const totalQ = currentSessionResults.totalQuestions;
    const items: GlobalLeaderboardEntry[] = [];
    const now = Date.now();
    const formattedNow = formatVietnameseTimestamp(now);

    // If individual or multiplayer mode
    if (currentSessionResults.players.length > 0) {
      currentSessionResults.players.forEach(p => {
        const correctList: number[] = [];
        const wrongList: number[] = [];
        let totalTimeTaken = 0;

        currentSessionResults.completedQuestions.forEach((q, idx) => {
          const ans = p.answers[q.id] || currentSessionResults.answersRecord[q.id];
          if (ans) {
            totalTimeTaken += ans.timeTaken || 0;
            if (ans.isCorrect) {
              correctList.push(idx + 1);
            } else {
              wrongList.push(idx + 1);
            }
          }
        });

        // If player didn't have answer records, fallback to p.correctCount
        const correctCount = p.correctCount;
        const wrongCount = p.wrongCount;
        const accuracy = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
        const nameParsed = parseVietnameseName(p.name);

        const badge = assignFunBadge({
          correctCount,
          totalQuestions: totalQ,
          score: p.score,
          accuracy,
          timeTakenSeconds: totalTimeTaken,
        });

        items.push({
          id: `session_${p.id}_${now}`,
          lastName: nameParsed.lastName,
          firstName: nameParsed.firstName,
          fullName: nameParsed.fullName,
          studentClass: nameParsed.studentClass,
          timestamp: formattedNow,
          createdAt: now,
          correctDetails: correctList.length > 0 ? correctList.join(', ') : correctCount.toString(),
          wrongDetails: wrongList.length > 0 ? wrongList.join(', ') : wrongCount.toString(),
          correctCount,
          wrongCount,
          totalQuestions: totalQ,
          score: p.score,
          accuracy,
          timeTakenSeconds: totalTimeTaken,
          grade,
          lessonTitle,
          questionSetTitle,
          badge,
        });
      });
    } else if (mode === 'team' && currentSessionResults.teams.length > 0) {
      // Teams
      currentSessionResults.teams.forEach(t => {
        const accuracy = totalQ > 0 ? Math.round((t.correctCount / totalQ) * 100) : 0;
        const badge = assignFunBadge({
          correctCount: t.correctCount,
          totalQuestions: totalQ,
          score: t.score,
          accuracy,
        });

        items.push({
          id: `session_team_${t.id}_${now}`,
          lastName: 'Đội',
          firstName: t.name,
          fullName: t.name,
          studentClass: `Khối ${grade}`,
          timestamp: formattedNow,
          createdAt: now,
          correctDetails: `${t.correctCount} câu`,
          wrongDetails: `${t.wrongCount} câu`,
          correctCount: t.correctCount,
          wrongCount: t.wrongCount,
          totalQuestions: totalQ,
          score: t.score,
          accuracy,
          grade,
          lessonTitle,
          questionSetTitle,
          badge,
        });
      });
    }

    return items;
  }, [currentSessionResults, grade, lessonTitle, questionSetTitle, mode]);

  // Load global entries from both server & localStorage
  const loadLeaderboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch server records
      let serverRecords: GlobalLeaderboardEntry[] = [];
      try {
        const res = await fetch('/api/global-leaderboard?limit=300');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.leaderboard)) {
            serverRecords = data.leaderboard.map((item: any) => {
              const nameParsed = parseVietnameseName(item.studentName || `${item.lastName} ${item.firstName}`);
              const badge = assignFunBadge({
                correctCount: item.correctCount || 0,
                totalQuestions: item.totalQuestions || 0,
                score: item.score || 0,
                accuracy: item.accuracy || 0,
                timeTakenSeconds: item.timeTakenSeconds,
              });

              return {
                id: item.id || `rec_${item.submittedAt}`,
                lastName: item.lastName ?? nameParsed.lastName,
                firstName: item.firstName ?? nameParsed.firstName,
                fullName: item.studentName || nameParsed.fullName,
                studentClass: item.studentClass || nameParsed.studentClass,
                timestamp: item.timestamp || formatVietnameseTimestamp(item.submittedAt),
                createdAt: item.submittedAt || Date.now(),
                correctDetails: item.correctDetails || String(item.correctCount || 0),
                wrongDetails: item.wrongDetails || String(item.wrongCount || 0),
                correctCount: Number(item.correctCount) || 0,
                wrongCount: Number(item.wrongCount) || 0,
                totalQuestions: Number(item.totalQuestions) || 0,
                score: Number(item.score) || 0,
                accuracy: Number(item.accuracy) || 0,
                timeTakenSeconds: item.timeTakenSeconds,
                grade: item.grade,
                lessonTitle: item.lessonTitle,
                questionSetTitle: item.questionSetTitle,
                badge,
              };
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch server global leaderboard:', err);
      }

      // 2. Fetch local storage records
      const localRecords = getLocalLeaderboard();

      // Combine unique records by ID or student+timestamp
      const map = new Map<string, GlobalLeaderboardEntry>();

      // Put server records
      serverRecords.forEach(r => map.set(r.id, r));

      // Put local records
      localRecords.forEach(r => {
        if (!map.has(r.id)) {
          map.set(r.id, r);
        }
      });

      // Put current session records if available
      currentSessionEntries.forEach(r => {
        // avoid exact dups
        const exists = Array.from(map.values()).some(
          ex => ex.fullName === r.fullName && Math.abs(ex.createdAt - r.createdAt) < 5000
        );
        if (!exists) {
          map.set(r.id, r);
          // Also persist locally
          saveLocalLeaderboard([r, ...localRecords]);
          // Sync with server in background
          fetch('/api/global-leaderboard/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentName: r.fullName,
              studentClass: r.studentClass,
              score: r.score,
              correctCount: r.correctCount,
              wrongCount: r.wrongCount,
              totalQuestions: r.totalQuestions,
              correctDetails: r.correctDetails,
              wrongDetails: r.wrongDetails,
              timeTakenSeconds: r.timeTakenSeconds,
              grade: r.grade,
              lessonTitle: r.lessonTitle,
              questionSetTitle: r.questionSetTitle,
              timestamp: r.timestamp,
            }),
          }).catch(() => {});
        }
      });

      const combined = Array.from(map.values());
      // Sort by score desc, accuracy desc, createdAt desc
      combined.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.createdAt - a.createdAt;
      });

      setEntries(combined);
      saveLocalLeaderboard(combined);
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionEntries]);

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData]);

  // Available unique classes for filter dropdown
  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(entries.map(e => e.studentClass).filter(Boolean)));
    return list.sort();
  }, [entries]);

  // Filtered dataset
  const displayEntries = useMemo(() => {
    let source = activeTab === 'current' ? currentSessionEntries : entries;

    if (selectedGrade !== 'all') {
      source = source.filter(e => e.grade === selectedGrade);
    }

    if (selectedClass !== 'all') {
      source = source.filter(
        e => e.studentClass.toLowerCase() === selectedClass.toLowerCase()
      );
    }

    if (selectedBadge !== 'all') {
      source = source.filter(e => e.badge?.id === selectedBadge);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      source = source.filter(
        e =>
          e.fullName.toLowerCase().includes(q) ||
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.studentClass.toLowerCase().includes(q)
      );
    }

    return source;
  }, [activeTab, currentSessionEntries, entries, selectedGrade, selectedClass, selectedBadge, searchQuery]);

  // Handle Copy to Clipboard for Google Sheets
  const handleCopyToClipboard = async () => {
    try {
      const tsv = formatForGoogleSheetsClipboard(displayEntries, true);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = formatForGoogleSheetsClipboard(displayEntries, true);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Handle CSV Download for Google Sheets / Excel
  const handleDownloadCsv = () => {
    const csv = generateGoogleSheetsCsv(displayEntries, true);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCsvFile(csv, `Bang_Vinh_Danh_Rung_Chuong_Vang_${dateStr}.csv`);
  };

  // Delete a specific record
  const handleDeleteEntry = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveLocalLeaderboard(updated);
    try {
      await fetch(`/api/global-leaderboard?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  // Clear all records
  const handleClearAll = async () => {
    setEntries([]);
    saveLocalLeaderboard([]);
    setShowDeleteConfirm(false);
    try {
      await fetch('/api/global-leaderboard', { method: 'DELETE' });
    } catch {}
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-lg border-2 border-amber-300 space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-blue-950 flex items-center justify-center shadow-md flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Bảng Vinh Danh Toàn Cầu & Thống Kê Học Sinh
              </h2>
              <span className="bg-amber-100 text-amber-800 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border border-amber-300">
                {displayEntries.length} học sinh
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Tự động lưu trữ điểm số học sinh qua các buổi thi và đồng bộ hóa với định dạng Google Sheets.
            </p>
          </div>
        </div>

        {/* Action Buttons for Google Sheets */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Copy for Google Sheets */}
          <button
            onClick={handleCopyToClipboard}
            className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
            }`}
            title="Sao chép toàn bộ hàng và dán trực tiếp vào ô A1 trên Google Sheets"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-emerald-700" />}
            <span>{copied ? 'Đã sao chép vào Clipboard!' : 'Sao chép cho Google Sheets'}</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Tải tệp .CSV chuẩn UTF-8 BOM, mở sắc nét trên Google Sheets & Excel"
          >
            <Download className="w-4 h-4 text-blue-700" />
            <span>Tải CSV</span>
          </button>

          {/* Open Google Sheets new */}
          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="Mở Google Sheets mới để dán kết quả"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">sheets.new</span>
          </a>

          {/* Help Button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300"
            title="Xem cấu trúc cột Google Sheet"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Apps Script Webhook Code */}
          <button
            onClick={() => setShowAppsScriptModal(true)}
            className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300"
            title="Mã Google Apps Script tự động đồng bộ"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FUN BADGES SHOWCASE BANNER */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
            Hệ thống huy hiệu vinh danh thú vị (Fun Badges)
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 bg-white/90 border border-amber-300 px-2.5 py-1 rounded-xl shadow-xs text-amber-800 font-bold">
            <span className="text-base">🔔</span> Quán Quân Chuông Vàng (100% đúng)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/90 border border-blue-300 px-2.5 py-1 rounded-xl shadow-xs text-blue-800 font-bold">
            <span className="text-base">⚡</span> Tia Chớp Tin Học (Cực nhanh & ≥80%)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/90 border border-purple-300 px-2.5 py-1 rounded-xl shadow-xs text-purple-800 font-bold">
            <span className="text-base">🌟</span> Chiến Binh Xuất Sắc (≥90%)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/90 border border-emerald-300 px-2.5 py-1 rounded-xl shadow-xs text-emerald-800 font-bold">
            <span className="text-base">🏆</span> Bậc Thầy Thuật Toán (≥80%)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/90 border border-cyan-300 px-2.5 py-1 rounded-xl shadow-xs text-cyan-800 font-bold">
            <span className="text-base">💡</span> Sao Sáng Công Nghệ (≥70%)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/90 border border-orange-300 px-2.5 py-1 rounded-xl shadow-xs text-orange-800 font-bold">
            <span className="text-base">🎯</span> Thiện Xạ Bấm Phím (≥50%)
          </span>
          <span className="inline-flex items-center gap-1 bg-white/90 border border-teal-300 px-2.5 py-1 rounded-xl shadow-xs text-teal-800 font-bold">
            <span className="text-base">🐝</span> Ong Vàng Chăm Chỉ (Hoàn thành bài)
          </span>
        </div>
      </div>

      {/* CONTROLS BAR: TABS, FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
        {/* Tab switch */}
        <div className="flex items-center bg-gray-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-blue-950 shadow-sm font-extrabold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Toàn bộ các buổi thi ({entries.length})
          </button>
          <button
            onClick={() => setActiveTab('current')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'current'
                ? 'bg-white text-blue-950 shadow-sm font-extrabold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lượt thi này ({currentSessionEntries.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Grade filter */}
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">Tất cả khối lớp</option>
            <option value="3">Khối Lớp 3</option>
            <option value="4">Khối Lớp 4</option>
            <option value="5">Khối Lớp 5</option>
          </select>

          {/* Class filter */}
          {availableClasses.length > 0 && (
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">Tất cả lớp ({availableClasses.length})</option>
              {availableClasses.map(cls => (
                <option key={cls} value={cls}>
                  Lớp {cls}
                </option>
              ))}
            </select>
          )}

          {/* Search bar */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Clear button if has entries */}
          {entries.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Làm mới bảng xếp hạng"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* STATS TABLE MATCHING GOOGLE SHEETS COLUMNS */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-amber-500 text-blue-950 font-black uppercase text-[11px] sticky top-0 z-10 tracking-wider shadow-sm">
              <tr>
                <th className="py-3 px-3 w-12 text-center">Hạng</th>
                <th className="py-3 px-3">Họ và </th>
                <th className="py-3 px-3">Tên học sinh</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3 text-center">Câu đúng</th>
                <th className="py-3 px-3 text-center">Câu sai</th>
                <th className="py-3 px-3 text-center">Tổng đúng</th>
                <th className="py-3 px-3 text-center">Tổng sai</th>
                <th className="py-3 px-3 text-center">Điểm</th>
                <th className="py-3 px-3 text-center">Tỉ lệ</th>
                <th className="py-3 px-3">Danh hiệu</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white font-medium">
              {displayEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-sm text-gray-500">Chưa có kết quả học sinh nào phù hợp bộ lọc</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Học sinh quét mã QR tham gia hoặc kết thúc lượt thi sẽ tự động hiển thị tại đây.
                    </p>
                  </td>
                </tr>
              ) : (
                displayEntries.map((item, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/50 transition-colors ${
                        isTop1
                          ? 'bg-amber-50/70 font-bold'
                          : idx % 2 === 1
                          ? 'bg-gray-50/40'
                          : 'bg-white'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            isTop1
                              ? 'bg-amber-400 text-blue-950 shadow-xs ring-2 ring-amber-300'
                              : isTop2
                              ? 'bg-slate-300 text-slate-800 font-bold'
                              : isTop3
                              ? 'bg-amber-700 text-white font-bold'
                              : 'text-gray-500 bg-gray-100'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* Họ và (đệm) */}
                      <td className="py-3 px-3 font-semibold text-gray-800 whitespace-nowrap">
                        {item.lastName || '—'}
                      </td>

                      {/* Tên học sinh */}
                      <td className="py-3 px-3 font-black text-gray-950 whitespace-nowrap">
                        {item.firstName}
                      </td>

                      {/* Lớp */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block bg-blue-100 text-blue-900 font-black text-[10px] px-2 py-0.5 rounded-md">
                          {item.studentClass || 'Chung'}
                        </span>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {item.timestamp}
                        </span>
                      </td>

                      {/* Câu trả lời đúng */}
                      <td className="py-3 px-3 text-center font-mono text-emerald-700 font-bold whitespace-nowrap">
                        {item.correctDetails || '0'}
                      </td>

                      {/* Câu trả lời sai */}
                      <td className="py-3 px-3 text-center font-mono text-rose-600 font-bold whitespace-nowrap">
                        {item.wrongDetails || '0'}
                      </td>

                      {/* Tổng số câu trả lời đúng */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs">
                          {item.correctCount}
                        </span>
                      </td>

                      {/* Tổng số câu trả lời sai */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold text-xs">
                          {item.wrongCount}
                        </span>
                      </td>

                      {/* Điểm */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-sm font-black text-amber-600">
                          {item.score}
                        </span>
                      </td>

                      {/* Tỉ lệ đúng % */}
                      <td className="py-3 px-3 text-center font-bold text-gray-700">
                        {item.accuracy}%
                      </td>

                      {/* Fun Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.badge ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold shadow-2xs ${item.badge.bgColor} ${item.badge.borderColor} ${item.badge.color}`}
                            title={item.badge.description}
                          >
                            <span>{item.badge.icon}</span>
                            <span>{item.badge.label}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleDeleteEntry(item.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          title="Xóa bản ghi này"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK INSTRUCTION ACCORDION / FOOTER */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <span>
            <strong>Đồng bộ Google Sheets:</strong> Nhấn <strong>"Sao chép cho Google Sheets"</strong> rồi mở tệp Google Sheets của bạn và nhấn <strong>Ctrl + V</strong> (hoặc <strong>Cmd + V</strong>) vào ô A1. Toàn bộ các cột và tiếng Việt có dấu sẽ tự động căn chuẩn 100%!
          </span>
        </div>
        <button
          onClick={handleCopyToClipboard}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 whitespace-nowrap flex-shrink-0"
        >
          {copied ? 'Đã sao chép!' : 'Sao chép ngay'}
        </button>
      </div>

      {/* HELP MODAL: GOOGLE SHEETS COLUMN STRUCTURE */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-gray-900">
                  Cấu Trúc Các Cột Trên Google Sheets
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Dữ liệu sao chép và tệp CSV xuất ra hoàn toàn tương thích với tệp Google Sheet của bạn theo đúng thứ tự 8 cột chuẩn:
            </p>

            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 space-y-1.5 text-xs font-mono">
              {GOOGLE_SHEETS_COLUMNS.map((col, idx) => (
                <div key={col} className="flex items-center justify-between py-0.5 border-b border-gray-200/50 last:border-0">
                  <span className="font-bold text-blue-900">Cột {String.fromCharCode(65 + idx)} ({idx + 1}):</span>
                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">"{col}"</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-950 text-white rounded-xl text-xs font-bold"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE APPS SCRIPT MODAL */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-gray-900">
                  Mã Google Apps Script Tự Động Đồng Bộ Vào Google Sheet
                </h3>
              </div>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Nếu giáo viên muốn dữ liệu học sinh thi nộp bài tự động ghi vào tệp Google Sheets của mình trong thời gian thực, hãy sao chép đoạn mã sau vào <strong>Tiện ích mở rộng (Extensions) &gt; Apps Script</strong> trong Google Sheets:
            </p>

            <pre className="flex-1 overflow-y-auto bg-slate-900 text-amber-300 p-4 rounded-2xl text-[11px] font-mono leading-relaxed select-all">
              {getGoogleAppsScriptTemplate()}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-gray-500 font-medium">
                Triển khai dưới dạng Web App với quyền truy cập "Anyone"
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getGoogleAppsScriptTemplate());
                    alert('Đã sao chép mã Google Apps Script!');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Sao chép mã
                </button>
                <button
                  onClick={() => setShowAppsScriptModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl text-xs font-bold"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-gray-900">
              Xóa bảng xếp hạng toàn cầu?
            </h3>
            <p className="text-xs text-gray-500">
              Hành động này sẽ xóa toàn bộ danh sách điểm học sinh đã lưu trên hệ thống để giáo viên bắt đầu buổi thi mới.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
