import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '../context/GameContext';
import { QuestionSet } from '../types/game';
import {
  QrCode,
  Copy,
  Download,
  ExternalLink,
  Users,
  CheckCircle2,
  X,
  Share2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Trophy,
} from 'lucide-react';

interface ShareQrModalProps {
  onClose: () => void;
  questionSet?: QuestionSet;
}

interface StudentSubmission {
  studentName: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  accuracy: number;
  submittedAt: number;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({ onClose, questionSet: propQuestionSet }) => {
  const {
    books,
    lessons,
    questionSets,
    activeGrade,
    activeBookId,
    activeLessonId,
    activeQuestionSetId,
    addToast,
  } = useGame();

  const currentSet = propQuestionSet || questionSets.find(s => s.id === activeQuestionSetId) || questionSets[0];
  const currentLesson = lessons.find(l => l.id === (currentSet?.lessonId || activeLessonId));
  const currentBook = books.find(b => b.id === (currentSet?.bookId || activeBookId));

  const [roomCode, setRoomCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'leaderboard'>('qr');
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [isRefreshingSubmissions, setIsRefreshingSubmissions] = useState(false);

  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Create room session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!currentSet) return;
      setIsLoading(true);

      try {
        const response = await fetch('/api/game-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grade: currentSet.grade || activeGrade,
            bookName: currentBook?.name || 'Tin học GDPT 2018',
            lessonTitle: currentLesson?.title || currentSet.title,
            questionSetTitle: currentSet.title,
            questions: currentSet.questions,
            defaultTimeSeconds: currentSet.defaultTimeSeconds || 20,
          }),
        });

        const data = await response.json();
        if (isMounted && data.success && data.roomCode) {
          setRoomCode(data.roomCode);
        }
      } catch (err) {
        console.warn('Could not create server session, fallback to local room code:', err);
        if (isMounted) {
          const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
          setRoomCode(fallbackCode);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [currentSet?.id]);

  // Construct Join URL
  const joinUrl = `${window.location.origin}?code=${roomCode || '123456'}`;

  // Copy URL to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      addToast('Đã sao chép liên kết tham gia vào bộ nhớ tạm!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      addToast('Không thể tự động sao chép, vui lòng bôi đen link để copy!', 'error');
    }
  };

  // Download QR code image as PNG
  const handleDownloadQr = () => {
    try {
      const svgElement = qrContainerRef.current?.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 600;
      canvas.height = 600;

      img.onload = () => {
        if (!ctx) return;
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 40, 40, 520, 520);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `MaQR_RungChuongVang_${roomCode}.png`;
        link.href = pngUrl;
        link.click();
        addToast('Đã tải xuống hình ảnh mã QR (.png)!', 'success');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err: any) {
      addToast('Không thể tạo file ảnh mã QR', 'error');
    }
  };

  // Fetch live submissions from students
  const fetchSubmissions = async () => {
    if (!roomCode) return;
    setIsRefreshingSubmissions(true);
    try {
      const res = await fetch(`/api/game-session/${roomCode}/leaderboard`);
      const data = await res.json();
      if (data.success && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.warn('Fetch submissions error:', err);
    } finally {
      setIsRefreshingSubmissions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchSubmissions();
      const interval = setInterval(fetchSubmissions, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab, roomCode]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col space-y-4 max-h-[94vh] border-2 border-amber-400">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-blue-950 flex items-center justify-center shadow-md">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-blue-950 uppercase tracking-wide">
                Chia sẻ Mã QR & Link cho Học sinh tham gia
              </h2>
              <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                KHÔNG thu thập Gmail • KHÔNG cần tài khoản Google
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

        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'qr' ? 'bg-white text-blue-950 shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-amber-600" />
            Mã QR & Link tham gia
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'leaderboard' ? 'bg-white text-blue-950 shadow' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-yellow-500" />
            Kết quả nộp bài trực tiếp ({submissions.length})
          </button>
        </div>

        {/* TAB 1: QR & LINK */}
        {activeTab === 'qr' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Info Badge */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Dành riêng cho học sinh tiểu học (Lớp 3, 4, 5):
              </div>
              <p className="leading-relaxed">
                Học sinh chỉ cần dùng <strong>camera điện thoại, máy tính bảng hoặc ứng dụng Zalo</strong> quét mã QR
                để vào thi trực tiếp. Không yêu cầu đăng nhập mật khẩu hay tài khoản Gmail.
              </p>
            </div>

            {/* QR Card & Room PIN */}
            <div className="bg-gradient-to-b from-blue-900 to-indigo-950 text-white rounded-3xl p-5 text-center shadow-xl border-2 border-amber-400/50 space-y-4">
              <div className="text-xs uppercase font-bold text-amber-300 tracking-wider">
                MÔN TIN HỌC LỚP {currentSet?.grade || activeGrade} • {currentLesson?.title || 'BÀI HỌC'}
              </div>

              {/* QR Code Container */}
              <div className="flex justify-center" ref={qrContainerRef}>
                <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-amber-400 inline-block">
                  {isLoading ? (
                    <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                      Đang tạo mã QR...
                    </div>
                  ) : (
                    <QRCodeSVG
                      value={joinUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  )}
                </div>
              </div>

              {/* Room Code */}
              <div className="bg-black/40 border border-amber-400/30 p-2.5 rounded-2xl inline-block px-6">
                <span className="text-[11px] text-amber-200/80 block uppercase font-bold">
                  Mã phòng thi 6 số:
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-yellow-300">
                  {roomCode || '...'}
                </span>
              </div>

              <div className="text-[11px] text-amber-100/90 italic">
                Bộ đề: "{currentSet?.title}" ({currentSet?.questions.length || 0} câu hỏi • {currentSet?.defaultTimeSeconds || 20}s/câu)
              </div>
            </div>

            {/* Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 block">
                Đường dẫn liên kết trực tiếp (Copy gửi nhóm lớp / Zalo):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={joinUrl}
                  className="flex-1 p-2.5 bg-gray-50 rounded-xl border border-gray-300 text-xs font-mono font-medium text-gray-800 select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Đã chép!' : 'Sao chép'}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4 text-blue-700" />
                Mở thử giao diện học sinh (Tab mới)
              </a>

              <div className="flex gap-2">
                <button
                  onClick={handleDownloadQr}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                  title="Tải ảnh mã QR về máy tính để chiếu lên màn hình lớp học"
                >
                  <Download className="w-4 h-4" />
                  Tải ảnh mã QR (.png)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE LEADERBOARD OF SUBMISSIONS */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            <div className="flex items-center justify-between bg-amber-50 p-3 rounded-2xl border border-amber-200">
              <div>
                <span className="font-bold text-xs text-amber-950 block">
                  Danh sách học sinh đã nộp bài thi
                </span>
                <span className="text-[11px] text-gray-500">
                  Phòng thi mã: <strong>{roomCode}</strong> • Tự động cập nhật trực tiếp
                </span>
              </div>
              <button
                onClick={fetchSubmissions}
                disabled={isRefreshingSubmissions}
                className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1 hover:bg-amber-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSubmissions ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-bold text-xs">Chưa có học sinh nào nộp bài.</p>
                <p className="text-[11px] mt-1">
                  Hãy cho học sinh quét mã QR ở tab trước để bắt đầu làm bài!
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {submissions.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl font-black flex items-center justify-center flex-shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-blue-950 shadow'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : idx === 2
                            ? 'bg-amber-700/60 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-black text-gray-900 text-sm">{sub.studentName}</div>
                        <div className="text-[11px] text-gray-500">
                          Đúng {sub.correctCount}/{sub.totalQuestions} câu • Độ chính xác: {sub.accuracy}%
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-amber-600 text-base">{sub.score} điểm</div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
