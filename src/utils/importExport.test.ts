import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleSheetUrl, parseCSV, convertRowsToQuestions } from './googleSheets';
import { parseQuestionsFromText } from './wordExportImport';

test('parseGoogleSheetUrl extracts sheet ID and generates export CSV URL', () => {
  const url1 = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
  const res1 = parseGoogleSheetUrl(url1);
  assert.equal(res1.sheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.equal(res1.gid, '0');
  assert.equal(res1.csvUrl, 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv&gid=0');

  const urlPub = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT5K/pubhtml';
  const resPub = parseGoogleSheetUrl(urlPub);
  assert.equal(resPub.sheetId, '2PACX-1vT5K');
  assert.ok(resPub.csvUrl?.includes('output=csv'));
});

test('parseCSV parses quoted cells and commas correctly', () => {
  const csv = `Câu hỏi,Phương án A,Phương án B,Phương án C,Phương án D,Đáp án đúng
"Thiết bị nào sau đây là thiết bị vào?","Chuột, phím","Màn hình","Loa","Máy in","A"`;
  const rows = parseCSV(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'Thiết bị nào sau đây là thiết bị vào?');
  assert.equal(rows[1][1], 'Chuột, phím');
  assert.equal(rows[1][5], 'A');
});

test('convertRowsToQuestions transforms table rows into Question objects', () => {
  const rows = [
    ['Câu hỏi', 'Phương án A', 'Phương án B', 'Phương án C', 'Phương án D', 'Đáp án đúng', 'Giải thích', 'Thời gian'],
    ['Bộ phận nào dùng để gõ chữ?', 'Màn hình', 'Bàn phím', 'Chuột', 'Loa', 'B', 'Bàn phím dùng để nhập kí tự', '20']
  ];
  const questions = convertRowsToQuestions(rows, 3, 'kn-tri-thuc', 'b1');
  assert.equal(questions.length, 1);
  assert.equal(questions[0].content, 'Bộ phận nào dùng để gõ chữ?');
  assert.equal(questions[0].correctAnswer, 1); // B is index 1
  assert.equal(questions[0].customTimeSeconds, 20);
  assert.equal(questions[0].options[1], 'Bàn phím');
});

test('parseQuestionsFromText extracts questions from Vietnamese Word test format', () => {
  const text = `
Câu 1: Thiết bị nào sau đây là thiết bị vào của máy tính?
A. Màn hình
B. Chuột
C. Loa
D. Máy in
Đáp án: B
Lời giải: Chuột giúp đưa thông tin điều khiển vào máy tính.

Câu 2: Để khởi động một phần mềm trên màn hình nền, em thực hiện thao tác nào?
A. Nháy đúp chuột vào biểu tượng phần mềm
B. Kéo thả chuột
C. Nháy nút phải chuột
D. Lăn nút cuộn chuột
Đáp án: A
Lời giải: Nháy đúp chuột trái giúp khởi động phần mềm.
`;

  const parsed = parseQuestionsFromText(text, 4, 'kn-tri-thuc', 'b2');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].correctAnswer, 1); // B
  assert.equal(parsed[1].correctAnswer, 0); // A
  assert.equal(parsed[0].options[1], 'Chuột');
  assert.equal(parsed[1].options[0], 'Nháy đúp chuột vào biểu tượng phần mềm');
  assert.ok(parsed[0].explanation.includes('Chuột'));
});
