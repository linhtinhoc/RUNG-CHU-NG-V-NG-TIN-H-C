import { Question, Grade, Difficulty } from '../types/game';

/**
 * Extracts Sheet ID and GID from any Google Sheets URL
 */
export function parseGoogleSheetUrl(url: string): { sheetId: string | null; gid: string | null; csvUrl: string | null } {
  try {
    const trimmed = url.trim();
    
    // Check if it's already a direct CSV URL
    if (trimmed.includes('format=csv') || trimmed.includes('output=csv')) {
      return { sheetId: null, gid: null, csvUrl: trimmed };
    }

    // Published web format: https://docs.google.com/spreadsheets/d/e/2PACX-xxxx/pubhtml or pub
    const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (pubMatch) {
      const pubId = pubMatch[1];
      const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      const csvUrl = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?gid=${gid}&single=true&output=csv`;
      return { sheetId: pubId, gid, csvUrl };
    }

    // Standard sheet URL format: https://docs.google.com/spreadsheets/d/SHEET_ID/...
    const standardMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (standardMatch) {
      const sheetId = standardMatch[1];
      const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      return { sheetId, gid, csvUrl };
    }

    return { sheetId: null, gid: null, csvUrl: null };
  } catch {
    return { sheetId: null, gid: null, csvUrl: null };
  }
}

/**
 * Robust CSV string parser handling quoted multi-line cells and commas inside quotes
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function parseCorrectAnswerIndex(ans: string, options: string[]): number {
  const cleaned = ans.trim().toUpperCase();
  if (cleaned === 'A' || cleaned === '0' || cleaned === '1.') return 0;
  if (cleaned === 'B' || cleaned === '1' || cleaned === '2.') return 1;
  if (cleaned === 'C' || cleaned === '2' || cleaned === '3.') return 2;
  if (cleaned === 'D' || cleaned === '3' || cleaned === '4.') return 3;

  // Check if ans directly matches one of options
  const lowerAns = ans.trim().toLowerCase();
  for (let i = 0; i < options.length; i++) {
    if (options[i].toLowerCase() === lowerAns) {
      return i;
    }
  }

  return 0;
}

function parseDifficulty(val?: string): Difficulty {
  if (!val) return 'medium';
  const v = val.toLowerCase().trim();
  if (v.includes('dễ') || v.includes('easy') || v === '1') return 'easy';
  if (v.includes('khó') || v.includes('hard') || v === '3') return 'hard';
  return 'medium';
}

/**
 * Converts parsed CSV rows into typed Question array
 */
export function convertRowsToQuestions(
  rows: string[][],
  grade: Grade = 3,
  bookId: string = 'kn-tri-thuc',
  lessonId: string = ''
): Question[] {
  if (rows.length === 0) return [];

  // Detect header row
  const header = rows[0].map(normalizeHeader);
  let contentIdx = header.findIndex(h => h.includes('cauhoi') || h.includes('noidung') || h.includes('question') || h.includes('debai'));
  let optAIdx = header.findIndex(h => h.includes('phuongana') || h === 'a' || h.includes('dapana') || h.includes('optiona'));
  let optBIdx = header.findIndex(h => h.includes('phuonganb') || h === 'b' || h.includes('dapanb') || h.includes('optionb'));
  let optCIdx = header.findIndex(h => h.includes('phuonganc') || h === 'c' || h.includes('dapanc') || h.includes('optionc'));
  let optDIdx = header.findIndex(h => h.includes('phuongand') || h === 'd' || h.includes('dapand') || h.includes('optiond'));
  let ansIdx = header.findIndex(h => h.includes('dapandung') || h === 'dapan' || h.includes('answer') || h.includes('key'));
  let explIdx = header.findIndex(h => h.includes('giaithich') || h.includes('loigiai') || h.includes('explanation'));
  let diffIdx = header.findIndex(h => h.includes('mucdo') || h.includes('dokho') || h.includes('difficulty'));
  let timeIdx = header.findIndex(h => h.includes('thoigian') || h.includes('time') || h.includes('giay'));
  let topicIdx = header.findIndex(h => h.includes('chude') || h.includes('topic'));

  let startIndex = (contentIdx !== -1 || optAIdx !== -1) ? 1 : 0;

  // Fallback if header wasn't found or recognized
  if (contentIdx === -1 && optAIdx === -1) {
    startIndex = 0;
    contentIdx = 0;
    optAIdx = 1;
    optBIdx = 2;
    optCIdx = 3;
    optDIdx = 4;
    ansIdx = 5;
    explIdx = 6;
    diffIdx = 7;
    timeIdx = 8;
  }

  const questions: Question[] = [];

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const content = (contentIdx >= 0 && row[contentIdx]) ? row[contentIdx].trim() : '';
    if (!content) continue;

    const optA = (optAIdx >= 0 && row[optAIdx]) ? row[optAIdx].trim() : 'Phương án A';
    const optB = (optBIdx >= 0 && row[optBIdx]) ? row[optBIdx].trim() : 'Phương án B';
    const optC = (optCIdx >= 0 && row[optCIdx]) ? row[optCIdx].trim() : 'Phương án C';
    const optD = (optDIdx >= 0 && row[optDIdx]) ? row[optDIdx].trim() : 'Phương án D';

    const options = [optA, optB, optC, optD];
    const rawAns = (ansIdx >= 0 && row[ansIdx]) ? row[ansIdx] : 'A';
    const correctAnswer = parseCorrectAnswerIndex(rawAns, options);

    const explanation = (explIdx >= 0 && row[explIdx]) ? row[explIdx].trim() : '';
    const difficulty = (diffIdx >= 0 && row[diffIdx]) ? parseDifficulty(row[diffIdx]) : 'medium';
    
    let customTimeSeconds: number | undefined = undefined;
    if (timeIdx >= 0 && row[timeIdx]) {
      const parsedTime = parseInt(row[timeIdx], 10);
      if (!isNaN(parsedTime) && parsedTime >= 5 && parsedTime <= 60) {
        customTimeSeconds = parsedTime;
      }
    }

    const topic = (topicIdx >= 0 && row[topicIdx]) ? row[topicIdx].trim() : undefined;

    questions.push({
      id: `q_gs_${Date.now()}_${r}_${Math.random().toString(36).substring(2, 6)}`,
      content,
      options,
      correctAnswer,
      explanation: explanation || 'Em hãy ghi nhớ kiến thức bài học để trả lời đúng nhé!',
      grade,
      bookId,
      lessonId,
      topic,
      difficulty,
      points: 10,
      customTimeSeconds: customTimeSeconds || 15
    });
  }

  return questions;
}

/**
 * Fetches and parses a public Google Sheet URL
 */
export async function fetchGoogleSheetQuestions(
  url: string,
  grade: Grade = 3,
  bookId: string = 'kn-tri-thuc',
  lessonId: string = ''
): Promise<{ success: boolean; questions: Question[]; error?: string }> {
  const parsed = parseGoogleSheetUrl(url);
  if (!parsed.csvUrl) {
    return {
      success: false,
      questions: [],
      error: 'Đường dẫn Google Sheets không hợp lệ. Vui lòng dán link bảng tính Google Sheets hợp lệ.'
    };
  }

  try {
    const response = await fetch(parsed.csvUrl);
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          questions: [],
          error: 'Không tìm thấy bảng tính. Hãy kiểm tra lại ID bảng tính.'
        };
      }
      return {
        success: false,
        questions: [],
        error: `Không thể đọc dữ liệu (HTTP ${response.status}). Vui lòng đảm bảo bạn đã mở quyền chia sẻ: "Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link).`
      };
    }

    const csvText = await response.text();
    if (!csvText || csvText.trim().length === 0) {
      return {
        success: false,
        questions: [],
        error: 'Tệp bảng tính trống không có dữ liệu.'
      };
    }

    const rows = parseCSV(csvText);
    const questions = convertRowsToQuestions(rows, grade, bookId, lessonId);

    if (questions.length === 0) {
      return {
        success: false,
        questions: [],
        error: 'Không tìm thấy câu hỏi hợp lệ trong bảng tính. Hãy kiểm tra lại các cột: Câu hỏi, Phương án A, B, C, D, Đáp án đúng.'
      };
    }

    return {
      success: true,
      questions
    };
  } catch (err: any) {
    return {
      success: false,
      questions: [],
      error: `Lỗi kết nối tới Google Sheets: ${err?.message || 'Vui lòng kiểm tra quyền truy cập công khai của bảng tính hoặc thử lại sau.'}`
    };
  }
}
