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
