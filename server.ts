import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side AI Question Generation Endpoint
app.post('/api/generate-questions', async (req, res) => {
  try {
    const {
      lessonTitle,
      grade,
      bookName,
      topic,
      customContent,
      questionCount = 5,
      difficulty = 'balanced',
      image,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(200).json({
        success: false,
        fallback: true,
        message: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Bạn có thể tự nhập nội dung hoặc sử dụng câu hỏi mẫu.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Bạn là chuyên gia giáo dục môn Tin học tiểu học Chương trình GDPT 2018 Việt Nam.
Hãy tạo ${questionCount} câu hỏi trắc nghiệm khách quan dành cho học sinh:
- Khối lớp: Lớp ${grade || 3}
- Môn học: Tin học
- Bộ sách giáo khoa: ${bookName || 'Kết nối tri thức với cuộc sống'}
- Tên bài học: ${lessonTitle || 'Bài học Tin học'}
- Chủ đề: ${topic || 'Tin học'}
- Mức độ khó: ${difficulty}
${customContent ? `- Nội dung tài liệu/bài học cung cấp bởi giáo viên:\n"""${customContent}"""\n` : ''}
${image ? `\nLƯU Ý QUAN TRỌNG VỀ HÌNH ẢNH ĐÍNH KÈM:\nNgười dùng đã tải lên hình ảnh đính kèm (có thể là trang sách giáo khoa, vở bài tập, đề kiểm tra, hoặc hình ảnh thiết bị/phần mềm Tin học):\n1. Hãy đọc và phân tích kỹ toàn bộ chữ viết, hình vẽ, sơ đồ, biểu tượng và bài tập trong hình ảnh.\n2. Nếu trong ảnh đã có sẵn câu hỏi và bài tập, hãy ưu tiên trích xuất và chuyển đổi các câu hỏi đó thành trắc nghiệm 4 lựa chọn có đáp án chuẩn xác.\n3. Nếu ảnh là nội dung lý thuyết trang sách, hãy tạo các câu hỏi bám sát kiến thức và hình ảnh minh họa trong trang sách đó.` : ''}

Yêu cầu định dạng bắt buộc:
1. Mỗi câu hỏi phải có đúng 4 phương án lựa chọn: A, B, C, D.
2. Đúng một đáp án đúng (chỉ số 0 cho A, 1 cho B, 2 cho C, 3 cho D).
3. Có lời giải thích ngắn gọn, dễ hiểu, phù hợp với học sinh tiểu học.
4. Điểm số mặc định: 10 điểm.
5. Thời gian làm bài gợi ý: từ 15 đến 30 giây (tối đa 60 giây).
6. Nội dung câu hỏi trong sáng, chuẩn kiến thức GDPT 2018, tiếng Việt chuẩn, không có lỗi chính tả.

Trả về kết quả duy nhất dưới dạng JSON Array hợp lệ theo cấu trúc:
[
  {
    "content": "Nội dung câu hỏi?",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correctAnswer": 0,
    "explanation": "Giải thích vì sao phương án này đúng...",
    "difficulty": "easy",
    "points": 10,
    "customTimeSeconds": 20
  }
]
Không bao gồm bất kỳ văn bản giải thích nào ngoài khối JSON.
`;

    const parts: any[] = [{ text: prompt }];

    // Handle attached image
    if (image) {
      let mimeType = 'image/jpeg';
      let base64Data = '';

      if (typeof image === 'string') {
        const match = image.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        } else {
          base64Data = image;
        }
      } else if (image.base64) {
        mimeType = image.mimeType || 'image/jpeg';
        base64Data = image.base64.replace(/^data:[^;]+;base64,/, '');
      }

      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(responseText);
    } catch {
      // try to extract json block
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) {
        parsedQuestions = JSON.parse(match[0]);
      } else {
        throw new Error('Không thể phân tích định dạng JSON từ phản hồi AI');
      }
    }

    return res.status(200).json({
      success: true,
      questions: parsedQuestions,
    });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi xử lý khi tạo câu hỏi với AI',
    });
  }
});

// Game Sessions in-memory store for student QR code & link join
interface StudentSubmission {
  id: string;
  studentName: string;
  lastName: string;       // "Họ và " (Họ và tên đệm)
  firstName: string;      // "Tên học sinh"
  studentClass: string;   // Lớp (ví dụ: 3A, 4B, 5C)
  timestamp: string;      // "Thời gian" (ví dụ: "09/11/2026 13:05")
  correctDetails: string; // "Câu trả lời đúng" (ví dụ: "1, 2, 4, 5")
  wrongDetails: string;   // "Câu trả lời sai" (ví dụ: "3")
  correctCount: number;   // "Tổng số câu trả lời đúng"
  wrongCount: number;     // "Tổng số câu trả lời sai"
  totalQuestions: number; // Tổng số câu hỏi
  score: number;          // "Điểm"
  accuracy: number;       // Tỉ lệ % đúng
  timeTakenSeconds?: number;
  submittedAt: number;
  grade?: number;
  lessonTitle?: string;
  questionSetTitle?: string;
  badgeLabel?: string;
  badgeIcon?: string;
}

interface GameSession {
  roomCode: string;
  createdAt: number;
  grade: number;
  bookName: string;
  lessonTitle: string;
  questionSetTitle: string;
  questions: any[];
  defaultTimeSeconds: number;
  submissions: StudentSubmission[];
}

const gameSessions = new Map<string, GameSession>();
const globalStudentLeaderboard: StudentSubmission[] = [];

// Helper to format Vietnamese timestamp
function formatTimeVN(timeMs?: number): string {
  const d = timeMs ? new Date(timeMs) : new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Helper to split Vietnamese full name into "Họ và " and "Tên học sinh"
function splitVietnameseName(rawName: string, fallbackClass = ''): { lastName: string; firstName: string; fullName: string; studentClass: string } {
  let text = (rawName || '').trim();
  let extractedClass = (fallbackClass || '').trim();

  // Pattern 1: "Nguyễn Văn An - 3A"
  const dashMatch = text.match(/^(.*?)\s*[-/–]\s*([1-5][A-Za-z0-9]*)\s*$/);
  if (dashMatch) {
    text = dashMatch[1].trim();
    if (!extractedClass) extractedClass = dashMatch[2].trim().toUpperCase();
  }

  // Pattern 2: "Nguyễn Văn An (Lớp 4B)"
  const parenMatch = text.match(/^(.*?)\s*\((?:Lớp\s*)?([1-5][A-Za-z0-9]*)\)\s*$/i);
  if (parenMatch) {
    text = parenMatch[1].trim();
    if (!extractedClass) extractedClass = parenMatch[2].trim().toUpperCase();
  }

  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return {
      lastName: '',
      firstName: parts[0] || 'Học sinh',
      fullName: parts[0] || 'Học sinh',
      studentClass: extractedClass || 'Chung',
    };
  }

  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, -1).join(' ');
  return {
    lastName,
    firstName,
    fullName: `${lastName} ${firstName}`,
    studentClass: extractedClass || 'Chung',
  };
}

// Helper to determine fun badge
function getFunBadgeServer(correctCount: number, totalQuestions: number, accuracy: number, timeTakenSeconds?: number) {
  if (totalQuestions > 0 && correctCount === totalQuestions) {
    return { icon: '🔔', label: 'Quán Quân Chuông Vàng' };
  }
  if (timeTakenSeconds && totalQuestions > 0 && timeTakenSeconds / totalQuestions <= 6 && accuracy >= 80) {
    return { icon: '⚡', label: 'Tia Chớp Tin Học' };
  }
  if (accuracy >= 90) return { icon: '🌟', label: 'Chiến Binh Xuất Sắc' };
  if (accuracy >= 80) return { icon: '🏆', label: 'Bậc Thầy Thuật Toán' };
  if (accuracy >= 70) return { icon: '💡', label: 'Sao Sáng Công Nghệ' };
  if (accuracy >= 50) return { icon: '🎯', label: 'Thiện Xạ Bấm Phím' };
  return { icon: '🐝', label: 'Ong Vàng Chăm Chỉ' };
}

// Helper to generate a 6-digit room code
function generateRoomCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return gameSessions.has(code) ? generateRoomCode() : code;
}

// Create a new game session for QR code / link sharing
app.post('/api/game-session', (req, res) => {
  try {
    const { grade, bookName, lessonTitle, questionSetTitle, questions, defaultTimeSeconds = 20, customCode } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bộ câu hỏi phải có ít nhất 1 câu hỏi để chia sẻ.',
      });
    }

    const roomCode = customCode && !gameSessions.has(customCode) ? customCode : generateRoomCode();

    const session: GameSession = {
      roomCode,
      createdAt: Date.now(),
      grade: grade || 3,
      bookName: bookName || 'Tin học',
      lessonTitle: lessonTitle || 'Bài học Tin học',
      questionSetTitle: questionSetTitle || 'Bộ đề thi Rung Chuông Vàng',
      questions,
      defaultTimeSeconds: defaultTimeSeconds || 20,
      submissions: [],
    };

    gameSessions.set(roomCode, session);

    // Clean up sessions older than 24 hours
    const now = Date.now();
    for (const [code, sess] of gameSessions.entries()) {
      if (now - sess.createdAt > 24 * 60 * 60 * 1000) {
        gameSessions.delete(code);
      }
    }

    return res.status(200).json({
      success: true,
      roomCode,
      session: {
        roomCode: session.roomCode,
        grade: session.grade,
        bookName: session.bookName,
        lessonTitle: session.lessonTitle,
        questionSetTitle: session.questionSetTitle,
        questionCount: session.questions.length,
        defaultTimeSeconds: session.defaultTimeSeconds,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tạo phòng thi',
    });
  }
});

// Get session details by roomCode for students scanning QR code
app.get('/api/game-session/:code', (req, res) => {
  const code = req.params.code?.toUpperCase();
  const session = gameSessions.get(code);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Mã phòng thi không tồn tại hoặc đã hết hạn. Hãy kiểm tra lại mã hoặc quét lại mã QR từ giáo viên.',
    });
  }

  return res.status(200).json({
    success: true,
    session: {
      roomCode: session.roomCode,
      grade: session.grade,
      bookName: session.bookName,
      lessonTitle: session.lessonTitle,
      questionSetTitle: session.questionSetTitle,
      questions: session.questions,
      defaultTimeSeconds: session.defaultTimeSeconds,
      submissionsCount: session.submissions.length,
    },
  });
});

// Student submits score (no Google account or Gmail needed)
app.post('/api/game-session/:code/submit', (req, res) => {
  const code = req.params.code?.toUpperCase();
  const session = gameSessions.get(code);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Phòng thi không tồn tại hoặc đã kết thúc.',
    });
  }

  const {
    studentName,
    studentClass: rawClass,
    score,
    correctCount,
    wrongCount,
    totalQuestions,
    correctDetails,
    wrongDetails,
    timeTakenSeconds,
  } = req.body;

  const numCorrect = Number(correctCount) || 0;
  const numWrong = Number(wrongCount) || 0;
  const numTotal = Number(totalQuestions) || session.questions.length;
  const numScore = Number(score) || 0;
  const numAccuracy = numTotal > 0 ? Math.round((numCorrect / numTotal) * 100) : 0;
  const submittedAt = Date.now();

  const nameParsed = splitVietnameseName(String(studentName || 'Học sinh'), String(rawClass || ''));
  const badge = getFunBadgeServer(numCorrect, numTotal, numAccuracy, Number(timeTakenSeconds));

  const submission: StudentSubmission = {
    id: `sub_${submittedAt}_${Math.random().toString(36).substring(2, 7)}`,
    studentName: nameParsed.fullName,
    lastName: nameParsed.lastName,
    firstName: nameParsed.firstName,
    studentClass: nameParsed.studentClass,
    timestamp: formatTimeVN(submittedAt),
    correctDetails: correctDetails ? String(correctDetails) : numCorrect.toString(),
    wrongDetails: wrongDetails ? String(wrongDetails) : numWrong.toString(),
    correctCount: numCorrect,
    wrongCount: numWrong,
    totalQuestions: numTotal,
    score: numScore,
    accuracy: numAccuracy,
    timeTakenSeconds: Number(timeTakenSeconds) || undefined,
    submittedAt,
    grade: session.grade,
    lessonTitle: session.lessonTitle,
    questionSetTitle: session.questionSetTitle,
    badgeLabel: badge.label,
    badgeIcon: badge.icon,
  };

  session.submissions.push(submission);

  // Also push to global cross-session leaderboard (dedup by id)
  globalStudentLeaderboard.unshift(submission);
  if (globalStudentLeaderboard.length > 1000) {
    globalStudentLeaderboard.pop();
  }

  return res.status(200).json({
    success: true,
    message: 'Nộp bài thi thành công!',
    rank: session.submissions.length,
    submission,
  });
});

// Get live submissions leaderboard for teacher
app.get('/api/game-session/:code/leaderboard', (req, res) => {
  const code = req.params.code?.toUpperCase();
  const session = gameSessions.get(code);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Phòng thi không tồn tại.',
    });
  }

  // Sort by score descending, then accuracy descending, then earliest time
  const sorted = [...session.submissions].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return a.submittedAt - b.submittedAt;
  });

  return res.status(200).json({
    success: true,
    roomCode: session.roomCode,
    submissions: sorted,
  });
});

// Global Cross-Session Leaderboard Endpoints
app.get('/api/global-leaderboard', (req, res) => {
  const { grade, studentClass, limit = 100 } = req.query;

  let filtered = [...globalStudentLeaderboard];

  if (grade) {
    filtered = filtered.filter(item => item.grade === Number(grade));
  }

  if (studentClass) {
    filtered = filtered.filter(item =>
      item.studentClass.toLowerCase() === String(studentClass).toLowerCase().trim()
    );
  }

  // Sort by score desc, accuracy desc, submission time desc
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.submittedAt - a.submittedAt;
  });

  const lim = Math.min(Number(limit) || 100, 500);

  return res.status(200).json({
    success: true,
    totalCount: filtered.length,
    leaderboard: filtered.slice(0, lim),
  });
});

// Record a session result or student into the global leaderboard
app.post('/api/global-leaderboard/record', (req, res) => {
  try {
    const {
      studentName,
      studentClass: rawClass,
      score,
      correctCount,
      wrongCount,
      totalQuestions,
      correctDetails,
      wrongDetails,
      timeTakenSeconds,
      grade,
      lessonTitle,
      questionSetTitle,
      timestamp,
    } = req.body;

    const numCorrect = Number(correctCount) || 0;
    const numWrong = Number(wrongCount) || 0;
    const numTotal = Number(totalQuestions) || (numCorrect + numWrong);
    const numScore = Number(score) || 0;
    const numAccuracy = numTotal > 0 ? Math.round((numCorrect / numTotal) * 100) : 0;
    const submittedAt = Date.now();

    const nameParsed = splitVietnameseName(String(studentName || 'Học sinh'), String(rawClass || ''));
    const badge = getFunBadgeServer(numCorrect, numTotal, numAccuracy, Number(timeTakenSeconds));

    const entry: StudentSubmission = {
      id: `glb_${submittedAt}_${Math.random().toString(36).substring(2, 7)}`,
      studentName: nameParsed.fullName,
      lastName: nameParsed.lastName,
      firstName: nameParsed.firstName,
      studentClass: nameParsed.studentClass,
      timestamp: timestamp ? String(timestamp) : formatTimeVN(submittedAt),
      correctDetails: correctDetails ? String(correctDetails) : numCorrect.toString(),
      wrongDetails: wrongDetails ? String(wrongDetails) : numWrong.toString(),
      correctCount: numCorrect,
      wrongCount: numWrong,
      totalQuestions: numTotal,
      score: numScore,
      accuracy: numAccuracy,
      timeTakenSeconds: Number(timeTakenSeconds) || undefined,
      submittedAt,
      grade: Number(grade) || undefined,
      lessonTitle: lessonTitle ? String(lessonTitle) : undefined,
      questionSetTitle: questionSetTitle ? String(questionSetTitle) : undefined,
      badgeLabel: badge.label,
      badgeIcon: badge.icon,
    };

    globalStudentLeaderboard.unshift(entry);
    if (globalStudentLeaderboard.length > 1000) {
      globalStudentLeaderboard.pop();
    }

    return res.status(200).json({
      success: true,
      entry,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lưu kết quả vào bảng toàn cầu',
    });
  }
});

// Clear or delete a global leaderboard record (for teacher management)
app.delete('/api/global-leaderboard', (req, res) => {
  const { id } = req.query;

  if (id) {
    const idx = globalStudentLeaderboard.findIndex(i => i.id === id);
    if (idx !== -1) {
      globalStudentLeaderboard.splice(idx, 1);
    }
    return res.status(200).json({ success: true, message: 'Đã xóa bản ghi' });
  }

// Clear all
  globalStudentLeaderboard.length = 0;
  return res.status(200).json({ success: true, message: 'Đã làm mới bảng xếp hạng toàn cầu' });
});

// ==========================================
// PERSISTENT QUESTIONS API (SUPABASE & FALLBACK)
// ==========================================
interface StoredQuestion {
  id: string;
  content: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  grade: number;
  bookId: string;
  lessonId: string;
  topic?: string;
  difficulty: string;
  points: number;
  customTimeSeconds?: number;
  imageUrl?: string;
  optionImages?: (string | undefined)[];
  setId?: string;
  createdAt: number;
}

const customQuestionsStore = new Map<string, StoredQuestion>();

// Helper to save to Supabase via HTTP PostgREST API (zero connection pool exhaustion on serverless)
async function saveToSupabase(question: StoredQuestion, setId?: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/questions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        id: question.id,
        content: question.content,
        options: question.options,
        correct_answer: question.correctAnswer,
        explanation: question.explanation,
        grade: question.grade,
        book_id: question.bookId,
        lesson_id: question.lessonId,
        topic: question.topic || 'Tin học',
        difficulty: question.difficulty || 'medium',
        points: question.points || 10,
        custom_time_seconds: question.customTimeSeconds || 20,
        image_url: question.imageUrl || null,
        option_images: question.optionImages || null,
        set_id: setId || null,
        created_at: new Date(question.createdAt).toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Supabase post failed, using local store:', err);
    return false;
  }
}

// Helper to fetch from Supabase
async function fetchFromSupabase(filters?: { grade?: number; lessonId?: string; setId?: string }): Promise<StoredQuestion[] | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  try {
    let url = `${supabaseUrl}/rest/v1/questions?select=*`;
    if (filters?.grade) url += `&grade=eq.${filters.grade}`;
    if (filters?.lessonId) url += `&lesson_id=eq.${filters.lessonId}`;
    if (filters?.setId) url += `&set_id=eq.${filters.setId}`;

    const res = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    if (res.ok) {
      const rows = await res.json();
      return rows.map((r: any) => ({
        id: r.id,
        content: r.content,
        options: r.options,
        correctAnswer: r.correct_answer,
        explanation: r.explanation,
        grade: r.grade,
        bookId: r.book_id,
        lessonId: r.lesson_id,
        topic: r.topic,
        difficulty: r.difficulty,
        points: r.points,
        customTimeSeconds: r.custom_time_seconds,
        imageUrl: r.image_url,
        optionImages: r.option_images,
        setId: r.set_id,
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      }));
    }
    return null;
  } catch (err) {
    console.warn('Supabase query failed:', err);
    return null;
  }
}

// 1. GET /api/questions - Fetch saved custom questions
app.get('/api/questions', async (req, res) => {
  try {
    const { grade, lessonId, setId } = req.query;
    const filter = {
      grade: grade ? Number(grade) : undefined,
      lessonId: lessonId ? String(lessonId) : undefined,
      setId: setId ? String(setId) : undefined,
    };

    // Try Supabase first if configured
    const remote = await fetchFromSupabase(filter);
    if (remote !== null) {
      return res.status(200).json({
        success: true,
        source: 'supabase',
        data: remote,
      });
    }

    // Fallback to local persistent store
    let localList = Array.from(customQuestionsStore.values());
    if (filter.grade) localList = localList.filter(q => q.grade === filter.grade);
    if (filter.lessonId) localList = localList.filter(q => q.lessonId === filter.lessonId);
    if (filter.setId) localList = localList.filter(q => q.setId === filter.setId);

    return res.status(200).json({
      success: true,
      source: 'local_store',
      data: localList,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi tải danh sách câu hỏi',
    });
  }
});

// 2. POST /api/questions - Save a new question permanently
app.post('/api/questions', async (req, res) => {
  try {
    const { question, setId } = req.body;

    if (!question || !question.content || !Array.isArray(question.options)) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung câu hỏi và các phương án lựa chọn không được để trống.',
      });
    }

    const qId = question.id || `q-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const stored: StoredQuestion = {
      id: qId,
      content: String(question.content).trim(),
      options: question.options.map((opt: any) => String(opt || '').trim()),
      correctAnswer: typeof question.correctAnswer === 'number' ? question.correctAnswer : 0,
      explanation: String(question.explanation || 'Ghi nhớ kiến thức bài học để chọn đáp án đúng!').trim(),
      grade: Number(question.grade) || 3,
      bookId: String(question.bookId || 'kn-tri-thuc'),
      lessonId: String(question.lessonId || ''),
      topic: question.topic ? String(question.topic) : 'Tin học',
      difficulty: question.difficulty || 'medium',
      points: Number(question.points) || 10,
      customTimeSeconds: Number(question.customTimeSeconds) || 20,
      imageUrl: question.imageUrl,
      optionImages: question.optionImages,
      setId: setId ? String(setId) : undefined,
      createdAt: Date.now(),
    };

    // Always keep in local store
    customQuestionsStore.set(stored.id, stored);

    // Save to Supabase if configured
    const savedRemote = await saveToSupabase(stored, setId);

    return res.status(200).json({
      success: true,
      data: stored,
      syncedWithDatabase: savedRemote,
      message: 'Đã lưu câu hỏi vĩnh viễn thành công!',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Lỗi khi lưu câu hỏi',
    });
  }
});

// 3. DELETE /api/questions/:id - Remove a question
app.delete('/api/questions/:id', async (req, res) => {
  const { id } = req.params;
  customQuestionsStore.delete(id);

  // If Supabase configured, delete there too
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/questions?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });
    } catch {}
  }

  return res.status(200).json({
    success: true,
    message: 'Đã xóa câu hỏi thành công',
  });
});

// Setup Vite in Dev or Serve Static in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
