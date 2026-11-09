import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  Packer,
  ShadingType
} from 'docx';
import mammoth from 'mammoth';
import { Question, QuestionSet, Grade } from '../types/game';

/**
 * Generates a professionally styled Vietnamese Word document (.docx)
 * and triggers download in the browser.
 */
export async function exportQuestionSetToDocx(
  questionSet: QuestionSet,
  options?: {
    bookName?: string;
    lessonTitle?: string;
    schoolName?: string;
    gradeText?: string;
  }
): Promise<void> {
  const schoolName = options?.schoolName || 'TRƯỜNG TIỂU HỌC ................................';
  const gradeLabel = `TIN HỌC LỚP ${questionSet.grade}`;
  const bookName = options?.bookName || 'Sách giáo khoa GDPT 2018';
  const lessonTitle = options?.lessonTitle || questionSet.title;

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Top School & Contest Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: schoolName.toUpperCase(),
                bold: true,
                size: 22, // 11pt
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: 'HỘI THI RUNG CHUÔNG VÀNG – LINH TIN HỌC',
                bold: true,
                size: 28, // 14pt
                color: 'C2410C', // orange-700
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `BỘ CÂU HỎI: ${questionSet.title.toUpperCase()}`,
                bold: true,
                size: 26, // 13pt
                font: 'Times New Roman'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Môn: ${gradeLabel} | Bộ sách: ${bookName} | Bài học: ${lessonTitle}`,
                italics: true,
                size: 20,
                font: 'Times New Roman'
              }),
              new TextRun({
                text: `\nSố lượng câu hỏi: ${questionSet.questions.length} câu | Thời gian mặc định: ${questionSet.defaultTimeSeconds}s/câu`,
                italics: true,
                size: 20,
                font: 'Times New Roman'
              })
            ]
          }),

          // Divider Line
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: '─'.repeat(45),
                color: '9CA3AF',
                font: 'Times New Roman'
              })
            ]
          }),

          // Section 1: Questions
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 100, after: 150 },
            children: [
              new TextRun({
                text: 'I. PHẦN CÂU HỎI TRẮC NGHIỆM',
                bold: true,
                size: 24,
                color: '1E3A8A', // blue-900
                font: 'Times New Roman'
              })
            ]
          }),

          // Question items
          ...questionSet.questions.flatMap((q, index) => {
            const timeInfo = q.customTimeSeconds ? ` (${q.customTimeSeconds} giây)` : '';
            const diffVN = q.difficulty === 'easy' ? 'Dễ' : q.difficulty === 'hard' ? 'Khó' : 'Trung bình';

            return [
              new Paragraph({
                spacing: { before: 140, after: 60 },
                children: [
                  new TextRun({
                    text: `Câu ${index + 1}: `,
                    bold: true,
                    size: 22,
                    font: 'Times New Roman'
                  }),
                  new TextRun({
                    text: q.content,
                    size: 22,
                    font: 'Times New Roman'
                  }),
                  new TextRun({
                    text: q.imageUrl ? ' (Kèm hình ảnh minh họa)' : '',
                    italics: true,
                    size: 18,
                    color: '2563EB',
                    font: 'Times New Roman'
                  }),
                  new TextRun({
                    text: ` [Mức độ: ${diffVN}${timeInfo}]`,
                    italics: true,
                    size: 18,
                    color: '6B7280',
                    font: 'Times New Roman'
                  })
                ]
              }),
              ...q.options.map((opt, optIdx) => {
                const optLetter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;
                return new Paragraph({
                  indent: { left: 400 },
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({
                      text: `${optLetter}. `,
                      bold: true,
                      size: 22,
                      font: 'Times New Roman'
                    }),
                    new TextRun({
                      text: opt,
                      size: 22,
                      font: 'Times New Roman'
                    }),
                    ...(q.optionImages?.[optIdx]
                      ? [
                          new TextRun({
                            text: ' (Kèm hình ảnh minh họa)',
                            italics: true,
                            size: 18,
                            color: '2563EB',
                            font: 'Times New Roman'
                          })
                        ]
                      : [])
                  ]
                });
              })
            ];
          }),

          // Section 2: Answer Keys & Explanations Table
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
            children: [
              new TextRun({
                text: 'II. BẢNG ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT',
                bold: true,
                size: 24,
                color: '1E3A8A',
                font: 'Times New Roman'
              })
            ]
          }),

          // Answer Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Table Header
              new TableRow({
                children: [
                  createTableCell('Câu', 10, true, 'E5E7EB'),
                  createTableCell('Đáp án đúng', 20, true, 'E5E7EB'),
                  createTableCell('Thời gian', 15, true, 'E5E7EB'),
                  createTableCell('Hướng dẫn giải & ghi chú', 55, true, 'E5E7EB')
                ]
              }),
              // Table Data Rows
              ...questionSet.questions.map((q, idx) => {
                const optLetter = ['A', 'B', 'C', 'D'][q.correctAnswer] || 'A';
                const correctText = `${optLetter}. ${q.options[q.correctAnswer] || ''}`;
                return new TableRow({
                  children: [
                    createTableCell(`${idx + 1}`, 10, false),
                    createTableCell(correctText, 20, true),
                    createTableCell(`${q.customTimeSeconds || questionSet.defaultTimeSeconds}s`, 15, false),
                    createTableCell(q.explanation || 'Kiến thức theo SGK Tin học GDPT 2018', 55, false)
                  ]
                });
              })
            ]
          }),

          // Footer note
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300 },
            children: [
              new TextRun({
                text: 'Hội thi Rung Chuông Vàng Tin học Tiểu học – Bản quyền thuộc về giáo viên',
                italics: true,
                size: 18,
                color: '9CA3AF',
                font: 'Times New Roman'
              })
            ]
          })
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const safeFilename = `${questionSet.title.replace(/[^a-zA-Z0-9À-ỹ_ ]/g, '')}_Lop${questionSet.grade}.docx`;
  
  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function createTableCell(
  text: string,
  widthPercent: number,
  isBold: boolean = false,
  fillColor?: string
): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: fillColor
      ? {
          type: ShadingType.CLEAR,
          fill: fillColor
        }
      : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: isBold,
            size: 20,
            font: 'Times New Roman'
          })
        ]
      })
    ]
  });
}

/**
 * Extracts raw text from an uploaded Word document (.docx) using mammoth
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Robust regex parser for Vietnamese question formats commonly used in test papers
 * (Câu 1: ... A. ... B. ... C. ... D. ... Đáp án: ... Lời giải: ...)
 */
export function parseQuestionsFromText(
  rawText: string,
  grade: Grade = 3,
  bookId: string = 'kn-tri-thuc',
  lessonId: string = ''
): Question[] {
  if (!rawText || !rawText.trim()) return [];

  // Split into candidate blocks by "Câu 1", "Câu 2", "Bài 1", or number patterns
  const questionBlocks: string[] = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  let currentBlock: string[] = [];
  const startPattern = /^(câu\s*\d+|câu\s*hỏi\s*\d+|\d+\.)\s*[:.-]?/i;

  for (const line of lines) {
    if (startPattern.test(line)) {
      if (currentBlock.length > 0) {
        questionBlocks.push(currentBlock.join('\n'));
      }
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock.join('\n'));
  }

  // If no "Câu X" was found, try splitting by double newlines
  const blocksToProcess = questionBlocks.length > 0 ? questionBlocks : rawText.split(/\n\s*\n/);
  const questions: Question[] = [];

  blocksToProcess.forEach((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Detect options A, B, C, D
    // Pattern looking for A. ... B. ... C. ... D. ...
    const optAPos = trimmed.search(/(?:^|\n|\s+)[Aa][\.\)\:]\s+/);
    const optBPos = trimmed.search(/(?:^|\n|\s+)[Bb][\.\)\:]\s+/);
    const optCPos = trimmed.search(/(?:^|\n|\s+)[Cc][\.\)\:]\s+/);
    const optDPos = trimmed.search(/(?:^|\n|\s+)[Dd][\.\)\:]\s+/);

    if (optAPos === -1 || optBPos === -1) {
      // Not enough options to be a valid 4-choice question
      return;
    }

    // Question content is from start up to optAPos
    let content = trimmed.substring(0, optAPos).trim();
    // Strip leading "Câu 1:", "1.", etc.
    content = content.replace(/^(câu\s*\d+|câu\s*hỏi\s*\d+|\d+\.)\s*[:.-]?\s*/i, '');

    // Extract options
    let optA = '';
    let optB = '';
    let optC = '';
    let optD = '';
    let afterOptions = '';

    if (optCPos !== -1 && optDPos !== -1) {
      optA = trimmed.substring(optAPos, optBPos).replace(/^[Aa][\.\)\:]\s*/, '').trim();
      optB = trimmed.substring(optBPos, optCPos).replace(/^[Bb][\.\)\:]\s*/, '').trim();
      optC = trimmed.substring(optCPos, optDPos).replace(/^[Cc][\.\)\:]\s*/, '').trim();
      
      const rest = trimmed.substring(optDPos).replace(/^[Dd][\.\)\:]\s*/, '').trim();
      // Look for "Đáp án:" or "Lời giải:" inside the remainder
      const answerPos = rest.search(/(?:đáp\s*án|key|trả\s*lời|lời\s*giải|giải\s*thích)\s*[:.-]/i);
      if (answerPos !== -1) {
        optD = rest.substring(0, answerPos).trim();
        afterOptions = rest.substring(answerPos);
      } else {
        optD = rest;
      }
    } else {
      // Fallback if only 2 options or irregular
      optA = trimmed.substring(optAPos, optBPos).replace(/^[Aa][\.\)\:]\s*/, '').trim();
      optB = trimmed.substring(optBPos).replace(/^[Bb][\.\)\:]\s*/, '').trim();
      optC = 'Phương án C';
      optD = 'Phương án D';
    }

    // Clean options from trailing newlines or markers
    optA = optA.replace(/^[Aa][\.\)\:]\s*/, '').trim();
    optB = optB.replace(/^[Bb][\.\)\:]\s*/, '').trim();
    optC = optC.replace(/^[Cc][\.\)\:]\s*/, '').trim();
    optD = optD.replace(/^[Dd][\.\)\:]\s*/, '').trim();

    // Parse answer key if available
    let correctAnswer = 0;
    const answerMatch = (afterOptions || trimmed).match(/(?:đáp\s*án|key|trả\s*lời)\s*[:.-]?\s*([A-Da-d0-3])/i);
    if (answerMatch) {
      const char = answerMatch[1].toUpperCase();
      if (char === 'A' || char === '0') correctAnswer = 0;
      else if (char === 'B' || char === '1') correctAnswer = 1;
      else if (char === 'C' || char === '2') correctAnswer = 2;
      else if (char === 'D' || char === '3') correctAnswer = 3;
    }

    // Parse explanation
    let explanation = '';
    const explMatch = (afterOptions || trimmed).match(/(?:lời\s*giải|giải\s*thích|hướng\s*dẫn|ghi\s*chú)\s*[:.-]?\s*([^\n]+)/i);
    if (explMatch) {
      explanation = explMatch[1].trim();
    }

    if (content && optA && optB) {
      questions.push({
        id: `q_word_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        content,
        options: [optA, optB, optC || 'Phương án C', optD || 'Phương án D'],
        correctAnswer,
        explanation: explanation || 'Em hãy nắm vững kiến thức bài học trong SGK Tin học.',
        grade,
        bookId,
        lessonId,
        difficulty: 'medium',
        points: 10,
        customTimeSeconds: 15
      });
    }
  });

  return questions;
}
