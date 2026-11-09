import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { exportQuestionSetToDocx, extractTextFromDocx, parseQuestionsFromText } from '../utils/wordExportImport';
import { fetchGoogleSheetQuestions } from '../utils/googleSheets';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  X,
  Info,
  Table,
  FileSpreadsheet,
  FileUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface ImportExportModalProps {
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({ onClose }) => {
  const {
    books,
    lessons,
    questionSets,
    activeGrade,
    activeBookId,
    activeLessonId,
    activeQuestionSetId,
    setActiveQuestionSetId,
    createQuestionSet,
    addQuestionToSet,
    exportQuestionSetAsJSON,
    exportAllDataAsJSON,
    importQuestionSetFromJSON,
    importAllDataFromJSON,
    resetToDefaultData,
    addToast,
  } = useGame();

  const [importTab, setImportTab] = useState<'json' | 'word' | 'sheets'>('json');
  const [pasteJsonInput, setPasteJsonInput] = useState('');
  const [importMode, setImportMode] = useState<'single' | 'full'>('single');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  // Word import state
  const [isProcessingWord, setIsProcessingWord] = useState(false);
  const [wordTargetChoice, setWordTargetChoice] = useState<'current' | 'new'>('current');

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState('');
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetTargetChoice, setSheetTargetChoice] = useState<'current' | 'new'>('new');

  const currentSet = questionSets.find(s => s.id === activeQuestionSetId);
  const currentLesson = lessons.find(l => l.id === activeLessonId);
  const currentBook = books.find(b => b.id === activeBookId);

  // Handle Export Word
  const handleExportWord = async () => {
    if (!currentSet) {
      addToast('Vui lòng chọn một bộ câu hỏi để xuất sang Word!', 'error');
      return;
    }
    setIsExportingWord(true);
    try {
      await exportQuestionSetToDocx(currentSet, {
        bookName: currentBook?.name,
        lessonTitle: currentLesson?.title,
      });
      addToast(`Đã xuất "${currentSet.title}" thành công ra tệp Word (.docx)!`, 'success');
    } catch (err: any) {
      addToast(`Lỗi khi tạo tệp Word: ${err?.message || 'Không thể xuất tệp'}`, 'error');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Handle JSON File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        if (importMode === 'single') {
          importQuestionSetFromJSON(content);
        } else {
          importAllDataFromJSON(content);
        }
      }
    };
    reader.onerror = () => {
      addToast('Không thể đọc tệp tin được tải lên!', 'error');
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pasteJsonInput.trim()) {
      addToast('Vui lòng dán nội dung JSON vào ô nhập liệu!', 'error');
      return;
    }
    if (importMode === 'single') {
      const res = importQuestionSetFromJSON(pasteJsonInput);
      if (res.success) setPasteJsonInput('');
    } else {
      const res = importAllDataFromJSON(pasteJsonInput);
      if (res.success) setPasteJsonInput('');
    }
  };

  // Handle Word File Upload & Parse
  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingWord(true);
    try {
      const rawText = await extractTextFromDocx(file);
      const questions = parseQuestionsFromText(rawText, activeGrade, activeBookId, activeLessonId);

      if (questions.length === 0) {
        addToast(
          'Không tìm thấy câu hỏi hợp lệ trong tệp Word. Định dạng cần có: Câu 1: ... A. ... B. ... C. ... D. ... Đáp án: ...',
          'error'
        );
        return;
      }

      if (wordTargetChoice === 'new' || !currentSet) {
        const baseTitle = file.name.replace(/\.[^/.]+$/, '');
        const newSet = createQuestionSet({
          title: baseTitle || `Bộ câu hỏi Word Lớp ${activeGrade}`,
          grade: activeGrade,
          bookId: activeBookId,
          lessonId: activeLessonId,
          topic: currentLesson?.topic || 'Tin học',
          questions,
        });
        setActiveQuestionSetId(newSet.id);
        addToast(`Đã tạo bộ câu hỏi mới "${newSet.title}" với ${questions.length} câu từ Word!`, 'success');
      } else {
        questions.forEach(q => addQuestionToSet(currentSet.id, q));
        addToast(`Đã thêm thành công ${questions.length} câu hỏi vào bộ "${currentSet.title}"!`, 'success');
      }
      e.target.value = '';
    } catch (err: any) {
      addToast(`Lỗi khi xử lý tệp Word: ${err?.message || 'Không thể đọc tệp'}`, 'error');
    } finally {
      setIsProcessingWord(false);
    }
  };

  // Handle Google Sheets Import
  const handleGoogleSheetsImport = async () => {
    if (!sheetUrl.trim()) {
      addToast('Vui lòng dán link Google Sheets!', 'error');
      return;
    }

    setIsFetchingSheet(true);
    try {
      const res = await fetchGoogleSheetQuestions(sheetUrl, activeGrade, activeBookId, activeLessonId);
      if (!res.success) {
        addToast(res.error || 'Không thể đọc dữ liệu từ Google Sheets', 'error');
        return;
      }

      const questions = res.questions;
      if (sheetTargetChoice === 'new' || !currentSet) {
        const newSet = createQuestionSet({
          title: `Bộ câu hỏi Google Sheets - Lớp ${activeGrade} (${new Date().toLocaleDateString('vi-VN')})`,
          grade: activeGrade,
          bookId: activeBookId,
          lessonId: activeLessonId,
          topic: currentLesson?.topic || 'Tin học',
          questions,
        });
        setActiveQuestionSetId(newSet.id);
        addToast(`Đã tạo bộ câu hỏi mới với ${questions.length} câu từ Google Sheets!`, 'success');
      } else {
        questions.forEach(q => addQuestionToSet(currentSet.id, q));
        addToast(`Đã thêm ${questions.length} câu hỏi vào bộ "${currentSet.title}"!`, 'success');
      }
      setSheetUrl('');
    } catch (err: any) {
      addToast(`Lỗi nhập Google Sheets: ${err?.message || 'Vui lòng kiểm tra lại đường dẫn'}`, 'error');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-amber-300 flex items-center justify-center shadow-md">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-950 uppercase">
                Quản lý Lưu trữ, Nhập & Xuất Dữ liệu
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Hỗ trợ tệp Word (.docx) in ấn, Google Sheets bảng tính trực tuyến và bản sao lưu JSON
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

        {/* Informational Banner */}
        <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <Info className="w-4 h-4 flex-shrink-0" />
            Lưu ý quan trọng cho giáo viên:
          </div>
          <p className="leading-relaxed">
            Dữ liệu được lưu trữ tự động trong trình duyệt của bạn. Để in ấn đề thi, hãy dùng{' '}
            <strong>Xuất ra Word (.docx)</strong>. Để đưa câu hỏi từ file soạn thảo hoặc Google Sheets vào đề thi, hãy chọn các tab nhập tương ứng bên dưới.
          </p>
        </div>

        {/* EXPORT SECTION */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" /> Xuất dữ liệu tải về máy
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Export Word (.docx) */}
            <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between space-y-2.5">
              <div>
                <span className="font-bold text-xs text-blue-950 flex items-center gap-1 block mb-1">
                  <FileText className="w-3.5 h-3.5 text-blue-700" /> Xuất ra Word (.docx)
                </span>
                <p className="text-[11px] text-gray-600 line-clamp-2">
                  {currentSet ? `"${currentSet.title}" (${currentSet.questions.length} câu kèm bảng đáp án)` : 'Chưa chọn bộ'}
                </p>
              </div>
              <button
                disabled={!currentSet || isExportingWord}
                onClick={handleExportWord}
                className="w-full py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow disabled:opacity-40"
              >
                <FileText className="w-4 h-4" />
                {isExportingWord ? 'Đang tạo...' : 'Tải tệp Word (.docx)'}
              </button>
            </div>

            {/* Export JSON Single */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-2.5">
              <div>
                <span className="font-bold text-xs text-gray-900 block mb-1">
                  Xuất bộ câu hỏi (.json)
                </span>
                <p className="text-[11px] text-gray-500 line-clamp-2">
                  Lưu bộ đề để gửi cho đồng nghiệp hoặc import lại sau.
                </p>
              </div>
              <button
                disabled={!currentSet}
                onClick={() => currentSet && exportQuestionSetAsJSON(currentSet.id)}
                className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow disabled:opacity-40"
              >
                <Download className="w-4 h-4" /> Tải tệp .json
              </button>
            </div>

            {/* Export All Backup */}
            <div className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-2.5">
              <div>
                <span className="font-bold text-xs text-gray-900 block mb-1">
                  Sao lưu toàn bộ ngân hàng
                </span>
                <p className="text-[11px] text-gray-500">
                  Toàn bộ lớp 3, 4, 5 và tất cả các bài học, bộ đề.
                </p>
              </div>
              <button
                onClick={exportAllDataAsJSON}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Database className="w-4 h-4" /> Tải toàn bộ (.json)
              </button>
            </div>
          </div>
        </div>

        {/* IMPORT SECTION */}
        <div className="space-y-3 pt-2 border-t">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" /> Nhập câu hỏi vào ứng dụng
            </h3>

            {/* Import Tabs */}
            <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setImportTab('json')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  importTab === 'json' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tệp JSON
              </button>
              <button
                onClick={() => setImportTab('word')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  importTab === 'word' ? 'bg-white shadow text-blue-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-700" /> Tệp Word (.docx)
              </button>
              <button
                onClick={() => setImportTab('sheets')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  importTab === 'sheets' ? 'bg-white shadow text-emerald-800' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Google Sheets
              </button>
            </div>
          </div>

          {/* TAB 1: JSON */}
          {importTab === 'json' && (
            <div className="space-y-3">
              <div className="flex gap-4 text-xs font-semibold text-gray-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    checked={importMode === 'single'}
                    onChange={() => setImportMode('single')}
                    className="text-blue-900"
                  />
                  Nhập 1 bộ câu hỏi
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="importType"
                    checked={importMode === 'full'}
                    onChange={() => setImportMode('full')}
                    className="text-blue-900"
                  />
                  Khôi phục toàn bộ ngân hàng
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="w-full flex-1 cursor-pointer">
                  <div className="p-3 border-2 border-dashed border-gray-300 hover:border-amber-400 rounded-2xl bg-gray-50 text-center text-xs font-bold text-gray-700 flex items-center justify-center gap-2 transition-colors">
                    <Upload className="w-4 h-4 text-amber-600" />
                    Chọn tệp .json từ máy tính để tải lên
                  </div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder="Hoặc dán trực tiếp mã JSON vào đây..."
                  value={pasteJsonInput}
                  onChange={e => setPasteJsonInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-[11px] focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <div className="flex justify-end mt-1">
                  <button
                    onClick={handlePasteImport}
                    disabled={!pasteJsonInput.trim()}
                    className="px-4 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs disabled:opacity-40"
                  >
                    Nhập từ văn bản dán
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORD (.DOCX) */}
          {importTab === 'word' && (
            <div className="space-y-3 bg-blue-50/30 p-3.5 rounded-2xl border border-blue-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-700 font-medium">
                  Hệ thống tự động nhận diện các câu hỏi trắc nghiệm A, B, C, D và đáp án đúng từ tệp Word (.docx).
                </p>
                <div className="flex gap-3 text-xs font-semibold">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="wordTarget"
                      checked={wordTargetChoice === 'current'}
                      onChange={() => setWordTargetChoice('current')}
                    />
                    Thêm vào bộ đang chọn
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="wordTarget"
                      checked={wordTargetChoice === 'new'}
                      onChange={() => setWordTargetChoice('new')}
                    />
                    Tạo thành bộ câu hỏi mới
                  </label>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200 text-[11px] text-gray-600">
                <strong>Quy chuẩn định dạng trong file Word:</strong>
                <pre className="mt-1 font-mono text-[10px] bg-gray-50 p-2 rounded-lg text-gray-800">
{`Câu 1: Thiết bị nào sau đây là thiết bị vào của máy tính?
A. Màn hình
B. Chuột
C. Loa
D. Máy in
Đáp án: B
Lời giải: Chuột giúp đưa thông tin điều khiển vào máy tính.`}
                </pre>
              </div>

              <label className="block w-full cursor-pointer">
                <div className="p-3.5 border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-2xl bg-white text-center text-xs font-bold text-blue-900 flex items-center justify-center gap-2 transition-colors shadow-sm">
                  {isProcessingWord ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Đang xử lý tệp Word...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 text-blue-700" />
                      Chọn tệp Word (.docx) từ máy tính của bạn
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleWordFileUpload}
                  disabled={isProcessingWord}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* TAB 3: GOOGLE SHEETS */}
          {importTab === 'sheets' && (
            <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-emerald-950 font-medium">
                  Nhập câu hỏi trực tiếp từ liên kết Google Sheets (Bảng tính công khai).
                </p>
                <div className="flex gap-3 text-xs font-semibold">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sheetTarget"
                      checked={sheetTargetChoice === 'new'}
                      onChange={() => setSheetTargetChoice('new')}
                    />
                    Tạo thành bộ đề mới
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="sheetTarget"
                      checked={sheetTargetChoice === 'current'}
                      onChange={() => setSheetTargetChoice('current')}
                    />
                    Thêm vào bộ đang chọn
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 block">
                  Đường liên kết Google Sheets:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                    value={sheetUrl}
                    onChange={e => setSheetUrl(e.target.value)}
                    className="flex-1 p-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                  <button
                    onClick={handleGoogleSheetsImport}
                    disabled={isFetchingSheet || !sheetUrl.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow disabled:opacity-40"
                  >
                    {isFetchingSheet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang nạp...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Nhập câu hỏi
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] text-gray-600 space-y-1">
                <div className="font-semibold text-emerald-900">Yêu cầu chia sẻ & thứ tự cột trong bảng tính:</div>
                <p>
                  1. Mở quyền chia sẻ: <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong>.
                </p>
                <p>
                  2. Tiêu đề các cột tương ứng: <em>Câu hỏi | Phương án A | Phương án B | Phương án C | Phương án D | Đáp án đúng | Lời giải | Thời gian</em>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* DANGER ZONE: FACTORY RESET */}
        <div className="pt-2 border-t flex items-center justify-between">
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Khôi phục dữ liệu gốc ban đầu
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 font-bold text-xs text-gray-800"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* CONFIRM RESET MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-gray-900">Khôi phục về dữ liệu gốc?</h4>
            <p className="text-xs text-gray-500">
              Tất cả các bộ câu hỏi và bài học do bạn tự tạo sẽ bị xóa và thay thế bằng các câu hỏi mẫu chuẩn SGK GDPT 2018.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  resetToDefaultData();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Xác nhận đặt lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
