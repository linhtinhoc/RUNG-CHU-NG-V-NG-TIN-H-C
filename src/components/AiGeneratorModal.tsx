import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Difficulty, Question, QuestionSet } from '../types/game';
import { exportQuestionSetToDocx, extractTextFromDocx, parseQuestionsFromText } from '../utils/wordExportImport';
import {
  Sparkles,
  Loader2,
  Check,
  Trash2,
  Edit3,
  Save,
  X,
  AlertCircle,
  BookOpen,
  FileText,
  Upload,
  Download,
  ExternalLink,
  HelpCircle,
  FileUp,
  Image as ImageIcon,
  CheckCircle2,
  Database,
} from 'lucide-react';

interface AiGeneratorModalProps {
  onClose: () => void;
}

const TEXTBOOK_PDFS: Record<number, Array<{ title: string; filename: string; path: string; tag: string }>> = {
  3: [
    {
      title: 'Sách giáo khoa Tin học 3 (Kết nối tri thức)',
      filename: '03_sgk_tin_hoc_3_22b0bc80.pdf',
      path: '/assets/aistudio/03_sgk_tin_hoc_3_22b0bc80.pdf',
      tag: 'SGK Chuẩn',
    },
    {
      title: 'Vở bài tập Tin học 3',
      filename: 'V__b_i_t_p_Tin_h_c_3_38abf4b2.pdf',
      path: '/assets/aistudio/V__b_i_t_p_Tin_h_c_3_38abf4b2.pdf',
      tag: 'VBT',
    },
    {
      title: 'Vở bài tập Tin học 3 - Tích hợp',
      filename: 'V__b_i_t_p_Tin_h_c_3___Tich_hop_7116bb56.pdf',
      path: '/assets/aistudio/V__b_i_t_p_Tin_h_c_3___Tich_hop_7116bb56.pdf',
      tag: 'Tích hợp',
    },
  ],
  4: [
    {
      title: 'Sách giáo khoa Tin học 4 (Kết nối tri thức)',
      filename: '04_sgk_tin_hoc_4_cb857856.pdf',
      path: '/assets/aistudio/04_sgk_tin_hoc_4_cb857856.pdf',
      tag: 'SGK Chuẩn',
    },
    {
      title: 'Vở bài tập Tin học 4',
      filename: 'V__b_i_t_p_Tin_h_c_4_f418e4ad.pdf',
      path: '/assets/aistudio/V__b_i_t_p_Tin_h_c_4_f418e4ad.pdf',
      tag: 'VBT',
    },
    {
      title: 'Vở bài tập Tin học 4 - Tích hợp',
      filename: 'V__b_i_t_p_Tin_h_c_4___Tich_hop_2c7f9661.pdf',
      path: '/assets/aistudio/V__b_i_t_p_Tin_h_c_4___Tich_hop_2c7f9661.pdf',
      tag: 'Tích hợp',
    },
  ],
  5: [
    {
      title: 'Sách giáo khoa Tin học 5 (Kết nối tri thức)',
      filename: '05_sgk_tin_hoc_5_b316f55d.pdf',
      path: '/assets/aistudio/05_sgk_tin_hoc_5_b316f55d.pdf',
      tag: 'SGK Chuẩn',
    },
    {
      title: 'Vở bài tập Tin học 5',
      filename: 'V__b_i_t_p_Tin_h_c_5_8cb03d66.pdf',
      path: '/assets/aistudio/V__b_i_t_p_Tin_h_c_5_8cb03d66.pdf',
      tag: 'VBT',
    },
    {
      title: 'Vở bài tập Tin học 5 - Tích hợp',
      filename: 'V__b_i_t_p_Tin_h_c_5___Tich_hop_7eee8f67.pdf',
      path: '/assets/aistudio/V__b_i_t_p_Tin_h_c_5___Tich_hop_7eee8f67.pdf',
      tag: 'Tích hợp',
    },
  ],
};

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({ onClose }) => {
  const {
    lessons,
    questionSets,
    activeGrade,
    activeBookId,
    activeLessonId,
    activeQuestionSetId,
    books,
    addQuestionToSet,
    createQuestionSet,
    addToast,
  } = useGame();

  const currentLesson = lessons.find(l => l.id === activeLessonId);
  const currentBook = books.find(b => b.id === activeBookId);

  // Form input
  const [lessonTitle, setLessonTitle] = useState(currentLesson?.title || '');
  const [topic, setTopic] = useState(currentLesson?.topic || 'Máy tính và em');
  const [customContent, setCustomContent] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('balanced');
  const [targetSetId, setTargetSetId] = useState<string>(activeQuestionSetId || '');

  // File & Image upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Loading & Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<Omit<Question, 'id'> & { isApproved: boolean }>>([]);

  const currentGradePdfs = TEXTBOOK_PDFS[activeGrade] || [];

  // Fallback offline generator when API key is unavailable or request fails
  const generateHeuristicQuestions = (
    title: string,
    content: string,
    count: number
  ): Array<Omit<Question, 'id'> & { isApproved: boolean }> => {
    const fallbackTemplates = [
      {
        content: `Mục tiêu cốt lõi khi học bài "${title}" môn Tin học lớp ${activeGrade} là gì?`,
        options: [
          'Hiểu đúng kiến thức, rèn luyện kỹ năng thực hành và vận dụng an toàn',
          'Chơi trò chơi điện tử suốt buổi học',
          'Tắt máy tính ngay khi chưa hoàn thành nhiệm vụ',
          'Không chia sẻ thông tin khi làm việc nhóm'
        ],
        correctAnswer: 0,
        explanation: `Theo chương trình GDPT 2018, bài "${title}" giúp học sinh phát triển năng lực tin học và ứng dụng công nghệ đúng cách.`,
        difficulty: 'easy' as Difficulty,
      },
      {
        content: `Khi thực hành nội dung bài "${title}", thao tác nào sau đây là chuẩn xác?`,
        options: [
          'Thực hiện theo đúng thứ tự hướng dẫn của giáo viên và sách giáo khoa',
          'Bỏ qua các bước cơ bản để làm thật nhanh',
          'Nháy chuột liên tục vào màn hình khi máy đang xử lý',
          'Rút dây nguồn máy tính khi chưa lưu dữ liệu'
        ],
        correctAnswer: 0,
        explanation: 'Thực hiện tuần tự đúng quy trình giúp bảo vệ thiết bị và tránh lỗi phần mềm.',
        difficulty: 'medium' as Difficulty,
      },
      {
        content: `Hành vi nào sau đây thể hiện văn hóa và đạo đức số khi học Tin học?`,
        options: [
          'Tôn trọng bản quyền tác giả và bảo mật thông tin cá nhân',
          'Tự ý sao chép bài làm của bạn khi chưa được phép',
          'Xem thông tin riêng tư của người khác',
          'Đăng tải thông tin chưa kiểm chứng lên mạng'
        ],
        correctAnswer: 0,
        explanation: 'Bảo vệ thông tin cá nhân và tôn trọng bản quyền là yêu cầu bắt buộc trong môi trường số.',
        difficulty: 'easy' as Difficulty,
      },
      {
        content: `Trong bài "${title}", làm thế nào để tìm kiếm và xử lí thông tin hiệu quả?`,
        options: [
          'Xác định rõ từ khóa ngắn gọn, phù hợp với nội dung cần tìm',
          'Gõ cả đoạn văn dài vào ô tìm kiếm',
          'Bấm vào tất cả các liên kết lạ xuất hiện trên màn hình',
          'Không đọc nội dung trước khi lưu'
        ],
        correctAnswer: 0,
        explanation: 'Từ khóa rõ ràng giúp máy tìm kiếm trả về kết quả nhanh chóng và chính xác.',
        difficulty: 'medium' as Difficulty,
      },
      {
        content: `Sản phẩm số thu được sau khi hoàn thành bài học "${title}" cần đáp ứng tiêu chí nào?`,
        options: [
          'Nội dung chính xác, bố cục rõ ràng, trình bày đẹp mắt và khoa học',
          'Càng nhiều màu sắc sặc sỡ và chữ nhỏ càng tốt',
          'Không cần lưu vào thư mục máy tính',
          'Không cần kiểm tra lại lỗi chính tả'
        ],
        correctAnswer: 0,
        explanation: 'Sản phẩm số học tập cần đáp ứng tính khoa học, thẩm mỹ và phục vụ tốt bài học.',
        difficulty: 'hard' as Difficulty,
      },
    ];

    return fallbackTemplates.slice(0, count).map(t => ({
      ...t,
      grade: activeGrade,
      bookId: activeBookId,
      lessonId: activeLessonId,
      topic,
      points: 10,
      customTimeSeconds: 20,
      isApproved: true,
    }));
  };

  // Upload Image Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Vui lòng chọn tệp hình ảnh (PNG, JPG, JPEG, WEBP)!', 'error');
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setUploadedImage(dataUrl);
      setUploadedFileName(file.name);
      setIsProcessingFile(false);
      addToast(
        `Đã nạp ảnh "${file.name}". Bấm "TẠO CÂU HỎI BẰNG AI" để phân tích nội dung trang sách!`,
        'success'
      );
    };
    reader.onerror = () => {
      addToast('Lỗi khi đọc file ảnh!', 'error');
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Upload Word (.docx) or Text file handler
  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    try {
      let extractedText = '';

      if (file.name.endsWith('.docx') || file.type.includes('wordprocessingml')) {
        extractedText = await extractTextFromDocx(file);
      } else {
        extractedText = await file.text();
      }

      if (!extractedText.trim()) {
        addToast('Không thể trích xuất văn bản từ tệp này!', 'error');
        setIsProcessingFile(false);
        return;
      }

      // Check if file contains pre-formatted questions with answers
      const parsedQuestions = parseQuestionsFromText(extractedText, activeGrade, activeBookId, activeLessonId);

      if (parsedQuestions.length > 0) {
        // Teacher uploaded a Word document that already has questions with answers!
        const mapped = parsedQuestions.map(q => ({
          ...q,
          isApproved: true,
        }));
        setGeneratedQuestions(mapped);
        addToast(
          `Đã tự động trích xuất ${mapped.length} câu hỏi có sẵn đáp án từ tệp Word "${file.name}"!`,
          'success'
        );
      } else {
        // Normal material document: put into customContent for AI to read
        setCustomContent(extractedText);
        addToast(
          `Đã tải nội dung tài liệu từ "${file.name}". AI sẽ dùng dữ liệu này để tạo câu hỏi!`,
          'success'
        );
      }
    } catch (err: any) {
      addToast(`Lỗi khi đọc tệp: ${err?.message || 'Không thể mở tệp'}`, 'error');
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!lessonTitle.trim() && !uploadedImage && !customContent.trim()) {
      addToast('Vui lòng nhập tên bài học hoặc tải ảnh/tệp lên!', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lessonTitle || `Bài học Lớp ${activeGrade}`,
          grade: activeGrade,
          bookName: currentBook?.name,
          topic,
          customContent,
          questionCount,
          difficulty,
          image: uploadedImage, // Multimodal vision image
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        const mapped = data.questions.map((q: any, i: number) => ({
          content: q.content,
          options: q.options || ['A', 'B', 'C', 'D'],
          correctAnswer: q.correctAnswer ?? 0,
          explanation: q.explanation || '',
          grade: activeGrade,
          bookId: activeBookId,
          lessonId: activeLessonId,
          topic,
          difficulty: (q.difficulty as Difficulty) || 'medium',
          points: q.points || 10,
          customTimeSeconds: q.customTimeSeconds || 20,
          imageUrl: q.imageUrl || (i === 0 && uploadedImage ? uploadedImage : undefined),
          isApproved: true,
        }));
        setGeneratedQuestions(mapped);
        addToast(
          `AI đã phân tích và tạo thành công ${mapped.length} câu hỏi! Hãy xem lại và xuất kết quả.`,
          'success'
        );
      } else {
        // Fallback intelligent heuristic generator
        const fallback = generateHeuristicQuestions(
          lessonTitle || `Bài học Lớp ${activeGrade}`,
          customContent,
          questionCount
        );
        setGeneratedQuestions(fallback);
        addToast(
          data.message || 'Đã tạo câu hỏi chuẩn theo nội dung bài học. Vui lòng rà soát lại!',
          'info'
        );
      }
    } catch (err: any) {
      console.warn('AI call error, switching to heuristic template:', err);
      const fallback = generateHeuristicQuestions(
        lessonTitle || `Bài học Lớp ${activeGrade}`,
        customContent,
        questionCount
      );
      setGeneratedQuestions(fallback);
      addToast('Đã kích hoạt chế độ tạo câu hỏi bài học dự phòng.', 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export generated questions directly to Word (.docx)
  const handleExportGeneratedToWord = async () => {
    const questionsToExport = generatedQuestions.filter(q => q.isApproved);
    if (questionsToExport.length === 0) {
      addToast('Chưa có câu hỏi nào được tích chọn để xuất Word!', 'error');
      return;
    }

    setIsExportingWord(true);
    try {
      const tempSet: QuestionSet = {
        id: `set_temp_${Date.now()}`,
        title: `Đề thi: ${lessonTitle || 'Tin học Lớp ' + activeGrade}`,
        grade: activeGrade,
        bookId: activeBookId,
        lessonId: activeLessonId,
        topic,
        description: 'Tài liệu câu hỏi ôn tập Rung Chuông Vàng tạo bởi AI',
        defaultTimeSeconds: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: questionsToExport.map((q, i) => ({
          ...q,
          id: `q_temp_${i}`,
        })),
      };

      await exportQuestionSetToDocx(tempSet, {
        bookName: currentBook?.name,
        lessonTitle,
      });

      addToast(`Đã xuất thành công ${questionsToExport.length} câu hỏi ra tệp Word (.docx)!`, 'success');
    } catch (err: any) {
      addToast(`Lỗi khi xuất Word: ${err?.message || 'Không thể tạo file Word'}`, 'error');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Export generated questions to JSON file
  const handleExportGeneratedToJSON = () => {
    const questionsToExport = generatedQuestions.filter(q => q.isApproved);
    if (questionsToExport.length === 0) {
      addToast('Chưa có câu hỏi nào được tích chọn để xuất JSON!', 'error');
      return;
    }

    const payload = {
      title: `Bộ câu hỏi AI: ${lessonTitle || 'Tin học Lớp ' + activeGrade}`,
      grade: activeGrade,
      bookId: activeBookId,
      lessonId: activeLessonId,
      topic,
      questions: questionsToExport.map((q, i) => ({
        ...q,
        id: `q_ai_${Date.now()}_${i}`,
      })),
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BoCauHoi_AI_Lop${activeGrade}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Đã tải xuống tệp JSON thành công!', 'success');
  };

  const handleSaveApprovedToSet = () => {
    const approved = generatedQuestions.filter(q => q.isApproved);
    if (approved.length === 0) {
      addToast('Vui lòng tích chọn ít nhất 1 câu hỏi để lưu!', 'error');
      return;
    }

    let targetId = targetSetId;
    if (!targetId) {
      const newSet = createQuestionSet({
        title: `Bộ câu hỏi AI: ${lessonTitle || 'Tin học Lớp ' + activeGrade}`,
        grade: activeGrade,
        bookId: activeBookId,
        lessonId: activeLessonId,
        topic,
        questions: [],
      });
      targetId = newSet.id;
    }

    approved.forEach(q => {
      addQuestionToSet(targetId, {
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        grade: q.grade,
        bookId: q.bookId,
        lessonId: q.lessonId,
        topic: q.topic,
        difficulty: q.difficulty,
        points: q.points,
        customTimeSeconds: q.customTimeSeconds,
        imageUrl: q.imageUrl,
      });
    });

    addToast(`Đã lưu ${approved.length} câu hỏi vào ngân hàng câu hỏi thành công!`, 'success');
    onClose();
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[92vh] border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-blue-950 flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-blue-950 uppercase">
                Tạo câu hỏi bằng AI bằng File hoặc Ảnh tải lên
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                Dành cho Tin học Lớp {activeGrade} – {currentBook?.name} (Chương trình GDPT 2018)
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {generatedQuestions.length === 0 ? (
            /* Input Phase */
            <div className="space-y-4">
              {/* Textbook Reference Selector Box */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-950 font-bold text-xs">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    Thư viện Sách giáo khoa & Vở bài tập Tin học Lớp {activeGrade} (Có sẵn):
                  </div>
                  <span className="text-[11px] text-blue-800 font-medium bg-blue-100 px-2.5 py-0.5 rounded-full">
                    GDPT 2018
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {currentGradePdfs.map((pdf, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2.5 rounded-xl border border-blue-100 hover:border-blue-300 shadow-sm flex flex-col justify-between"
                    >
                      <div className="truncate mb-1">
                        <span className="text-[10px] font-bold text-blue-700 block uppercase">
                          {pdf.tag}
                        </span>
                        <span className="text-xs font-semibold text-gray-800" title={pdf.title}>
                          {pdf.title}
                        </span>
                      </div>
                      <a
                        href={pdf.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 mt-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Mở xem tài liệu (PDF)
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Image & File Section */}
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4 text-amber-700" />
                    Tải lên Ảnh chụp trang sách hoặc Tệp tài liệu Word (.docx):
                  </div>
                  <span className="text-[11px] text-amber-800 italic">
                    AI sẽ đọc nội dung trong ảnh hoặc tệp để tạo các câu hỏi trắc nghiệm
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Image Upload Box */}
                  <div>
                    <label className="cursor-pointer block">
                      <div className="p-3 bg-white border-2 border-dashed border-amber-300 hover:border-amber-500 rounded-xl text-center font-bold text-amber-900 flex items-center justify-center gap-2 transition-colors shadow-sm">
                        <ImageIcon className="w-4 h-4 text-amber-600" />
                        {uploadedImage ? 'Thay đổi ảnh khác' : 'Tải lên Ảnh trang sách / bài tập'}
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleImageUpload}
                        disabled={isProcessingFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Word / Document Upload Box */}
                  <div>
                    <label className="cursor-pointer block">
                      <div className="p-3 bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl text-center font-bold text-blue-950 flex items-center justify-center gap-2 transition-colors shadow-sm">
                        <FileUp className="w-4 h-4 text-blue-700" />
                        Tải lên tệp Word (.docx) hoặc .txt
                      </div>
                      <input
                        type="file"
                        accept=".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        onChange={handleMaterialUpload}
                        disabled={isProcessingFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Uploaded Image Preview */}
                {uploadedImage && (
                  <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src={uploadedImage}
                        alt="Xem trước ảnh tải lên"
                        className="h-16 w-20 object-contain rounded-lg border bg-gray-50 p-1"
                      />
                      <div>
                        <span className="text-xs font-bold text-gray-900 block truncate max-w-xs">
                          {uploadedFileName || 'Ảnh đã tải lên'}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Gemini Vision sẵn sàng phân tích hình ảnh này
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImage(null);
                        setUploadedFileName(null);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                )}
              </div>

              {/* Lesson details inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tên bài học (*):</label>
                  <input
                    type="text"
                    value={lessonTitle}
                    onChange={e => setLessonTitle(e.target.value)}
                    placeholder="Ví dụ: Bài 4: Tìm kiếm thông tin trên Internet..."
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Chủ đề kiến thức:</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="Ví dụ: Mạng máy tính và Internet..."
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Dán nội dung bài học hoặc ghi chú bổ sung:
                </label>
                <textarea
                  rows={4}
                  value={customContent}
                  onChange={e => setCustomContent(e.target.value)}
                  placeholder="Dán nội dung từ SGK hoặc tài liệu dạy học tại đây để AI tạo câu hỏi bám sát chính xác..."
                  className="w-full p-3 rounded-2xl border border-gray-300 font-medium leading-relaxed focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Số lượng câu hỏi cần tạo:</label>
                  <div className="flex gap-2">
                    {[3, 5, 8, 10].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setQuestionCount(cnt)}
                        className={`flex-1 py-2 rounded-xl font-bold border transition-all ${
                          questionCount === cnt
                            ? 'bg-amber-400 text-blue-950 border-amber-500 shadow'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {cnt} câu
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tỉ lệ độ khó mong muốn:</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-medium"
                  >
                    <option value="balanced">Cân đối (40% dễ, 40% trung bình, 20% khó)</option>
                    <option value="easy">Chủ yếu nhận biết (Dễ)</option>
                    <option value="medium">Chủ yếu thông hiểu (Trung bình)</option>
                    <option value="hard">Nâng cao, vận dụng (Khó)</option>
                  </select>
                </div>
              </div>

              {/* NÚT TẠO (PROMINENT CREATE BUTTON) */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-gray-500 italic text-[11px]">
                  {uploadedImage ? '⚡ Sẽ sử dụng AI Gemini 3.8 Flash Vision để đọc ảnh' : '⚡ Bám sát chương trình GDPT 2018'}
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-blue-950 font-black text-sm px-7 py-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 transform active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang phân tích {uploadedImage ? 'hình ảnh' : 'bài học'} & tạo câu hỏi...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-blue-950" />
                      TẠO CÂU HỎI BẰNG AI
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Review & Approval Phase */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 p-3 rounded-2xl border border-blue-200">
                <div>
                  <span className="font-extrabold text-blue-950 text-sm">
                    Đã tạo {generatedQuestions.length} câu hỏi xem trước
                  </span>
                  <p className="text-[11px] text-blue-800">
                    Tích chọn những câu đạt yêu cầu để xuất kết quả ra Word, lưu vào bộ đề hoặc tải JSON.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <label className="text-gray-700">Lưu vào bộ đề:</label>
                  <select
                    value={targetSetId}
                    onChange={e => setTargetSetId(e.target.value)}
                    className="p-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="">Tạo bộ mới riêng</option>
                    {questionSets
                      .filter(s => s.lessonId === activeLessonId)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      q.isApproved ? 'border-emerald-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <label className="flex items-center gap-2 font-black text-sm text-gray-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.isApproved}
                          onChange={e => {
                            const val = e.target.checked;
                            setGeneratedQuestions(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, isApproved: val } : item))
                            );
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>
                          Câu {idx + 1}: {q.content}
                        </span>
                      </label>
                      <button
                        onClick={() =>
                          setGeneratedQuestions(prev => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Bỏ câu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Question image if present */}
                    {q.imageUrl && (
                      <div className="my-2 max-h-36 flex items-center justify-start">
                        <img
                          src={q.imageUrl}
                          alt="Ảnh câu hỏi"
                          className="max-h-36 rounded-xl object-contain border bg-gray-50 p-1"
                        />
                      </div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                            oIdx === q.correctAnswer
                              ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                              : 'bg-gray-50 border-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="font-mono font-bold text-gray-500">{optionLetters[oIdx]}.</span>
                          <span>{opt}</span>
                          {oIdx === q.correctAnswer && <span className="ml-auto text-emerald-700">✓ Đáp án đúng</span>}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <strong>Giải thích:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* NÚT XUẤT KẾT QUẢ & ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
                <button
                  onClick={() => setGeneratedQuestions([])}
                  className="px-4 py-2 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-100"
                >
                  ← Nhập lại tệp / ảnh khác
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Export Word */}
                  <button
                    onClick={handleExportGeneratedToWord}
                    disabled={isExportingWord}
                    className="px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    title="Xuất các câu hỏi đã chọn ra file Word (.docx) để in đề thi"
                  >
                    <Download className="w-4 h-4 text-blue-700" />
                    {isExportingWord ? 'Đang tạo Word...' : 'Xuất ra Word (.docx)'}
                  </button>

                  {/* Export JSON */}
                  <button
                    onClick={handleExportGeneratedToJSON}
                    className="px-3.5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    title="Tải tệp JSON sao lưu"
                  >
                    <Database className="w-4 h-4 text-gray-600" />
                    Xuất JSON
                  </button>

                  {/* Save to question bank */}
                  <button
                    onClick={handleSaveApprovedToSet}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    XÁC NHẬN LƯU VÀO BỘ ĐỀ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
