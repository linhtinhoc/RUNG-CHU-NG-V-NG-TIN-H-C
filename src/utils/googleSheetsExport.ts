import { GlobalLeaderboardEntry } from './leaderboard';

/**
 * Standard Header Columns as specified by user:
 * Họ và ,Tên học sinh,Thời gian,Câu trả lời đúng,Câu trả lời sai,Tổng số câu trả lời đúng,Tổng số câu trả lời sai,Điểm
 */
export const GOOGLE_SHEETS_COLUMNS = [
  'Họ và ',
  'Tên học sinh',
  'Thời gian',
  'Câu trả lời đúng',
  'Câu trả lời sai',
  'Tổng số câu trả lời đúng',
  'Tổng số câu trả lời sai',
  'Điểm',
  'Lớp',
  'Tỉ lệ đúng (%)',
  'Danh hiệu / Huy hiệu',
];

/**
 * Formats data for clipboard pasting directly into Google Sheets (Tab-Separated Values).
 * When pasted into cell A1 in Google Sheets, every column automatically aligns perfectly.
 */
export function formatForGoogleSheetsClipboard(
  entries: GlobalLeaderboardEntry[],
  includeExtendedCols = true
): string {
  const headers = includeExtendedCols
    ? GOOGLE_SHEETS_COLUMNS
    : GOOGLE_SHEETS_COLUMNS.slice(0, 8);

  const rows = entries.map(entry => {
    const row = [
      entry.lastName || '',
      entry.firstName || '',
      entry.timestamp || '',
      entry.correctDetails || '0',
      entry.wrongDetails || '0',
      entry.correctCount.toString(),
      entry.wrongCount.toString(),
      entry.score.toString(),
    ];

    if (includeExtendedCols) {
      row.push(
        entry.studentClass || 'Chung',
        `${entry.accuracy}%`,
        entry.badge?.label || ''
      );
    }

    return row.map(val => String(val).replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ')).join('\t');
  });

  return [headers.join('\t'), ...rows].join('\n');
}

/**
 * Escapes a cell for CSV formatting
 */
function escapeCsvCell(cell: string | number): string {
  const str = String(cell ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates CSV content with UTF-8 BOM so Vietnamese characters render accurately in Google Sheets & Excel
 */
export function generateGoogleSheetsCsv(
  entries: GlobalLeaderboardEntry[],
  includeExtendedCols = true
): string {
  const headers = includeExtendedCols
    ? GOOGLE_SHEETS_COLUMNS
    : GOOGLE_SHEETS_COLUMNS.slice(0, 8);

  const headerLine = headers.map(escapeCsvCell).join(',');

  const lines = entries.map(entry => {
    const row = [
      entry.lastName || '',
      entry.firstName || '',
      entry.timestamp || '',
      entry.correctDetails || '0',
      entry.wrongDetails || '0',
      entry.correctCount,
      entry.wrongCount,
      entry.score,
    ];

    if (includeExtendedCols) {
      row.push(
        entry.studentClass || 'Chung',
        `${entry.accuracy}%`,
        entry.badge?.label || ''
      );
    }

    return row.map(escapeCsvCell).join(',');
  });

  // \uFEFF is UTF-8 Byte Order Mark (BOM)
  return '\uFEFF' + [headerLine, ...lines].join('\r\n');
}

/**
 * Triggers browser file download of CSV
 */
export function downloadCsvFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Google Apps Script Web App Template
 * Allows teachers to paste this script into Google Sheets Extensions > Apps Script
 * so results can be automatically received and inserted into their sheet in real time!
 */
export function getGoogleAppsScriptTemplate(): string {
  return `/**
 * GOOGLE APPS SCRIPT CHO BẢNG VINH DANH RUNG CHUÔNG VÀNG - LINH TIN HỌC
 * Hướng dẫn cài đặt:
 * 1. Mở tệp Google Sheets của bạn.
 * 2. Chọn Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Dán toàn bộ mã này vào và nhấn Lưu (Save).
 * 4. Nhấn nút "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: Ứng dụng web (Web app).
 * 6. Mục "Người có quyền truy cập" (Who has access): Chọn "Bất kỳ ai" (Anyone).
 * 7. Sao chép URL ứng dụng web và dán vào phần cài đặt của trò chơi.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Tạo tiêu đề nếu bảng tính còn trống
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Họ và ",
        "Tên học sinh",
        "Thời gian",
        "Câu trả lời đúng",
        "Câu trả lời sai",
        "Tổng số câu trả lời đúng",
        "Tổng số câu trả lời sai",
        "Điểm",
        "Lớp",
        "Tỉ lệ đúng (%)",
        "Danh hiệu"
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#F59E0B").setFontColor("#1E3A8A");
    }
    
    // Ghi hàng dữ liệu học sinh
    sheet.appendRow([
      data.lastName || "",
      data.firstName || "",
      data.timestamp || new Date().toLocaleString("vi-VN"),
      data.correctDetails || "",
      data.wrongDetails || "",
      data.correctCount || 0,
      data.wrongCount || 0,
      data.score || 0,
      data.studentClass || "",
      data.accuracy ? (data.accuracy + "%") : "",
      data.badgeLabel || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Đã ghi nhận điểm học sinh thành công!"
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;
}
