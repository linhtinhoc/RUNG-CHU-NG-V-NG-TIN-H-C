import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVietnameseName, assignFunBadge, formatVietnameseTimestamp } from './leaderboard';
import {
  formatForGoogleSheetsClipboard,
  generateGoogleSheetsCsv,
  GOOGLE_SHEETS_COLUMNS,
} from './googleSheetsExport';

test('parseVietnameseName accurately parses Vietnamese names and classes', () => {
  // Test case 1: Standard 3-word name with dash class
  const r1 = parseVietnameseName('Nguyễn Văn An - 3A');
  assert.equal(r1.lastName, 'Nguyễn Văn');
  assert.equal(r1.firstName, 'An');
  assert.equal(r1.studentClass, '3A');

  // Test case 2: Parentheses class format
  const r2 = parseVietnameseName('Lê Thị Mai (Lớp 4B)');
  assert.equal(r2.lastName, 'Lê Thị');
  assert.equal(r2.firstName, 'Mai');
  assert.equal(r2.studentClass, '4B');

  // Test case 3: Single name
  const r3 = parseVietnameseName('Bảo', '5A');
  assert.equal(r3.lastName, '');
  assert.equal(r3.firstName, 'Bảo');
  assert.equal(r3.studentClass, '5A');

  // Test case 4: Trailing class
  const r4 = parseVietnameseName('Trần Hoàng Long 5B');
  assert.equal(r4.lastName, 'Trần Hoàng');
  assert.equal(r4.firstName, 'Long');
  assert.equal(r4.studentClass, '5B');
});

test('assignFunBadge awards correct badges based on scores and conditions', () => {
  // 100% correct gets Golden Bell Champion
  const b1 = assignFunBadge({
    correctCount: 10,
    totalQuestions: 10,
    score: 100,
    accuracy: 100,
    timeTakenSeconds: 50,
  });
  assert.equal(b1.id, 'golden_bell_champion');
  assert.equal(b1.icon, '🔔');

  // Fast speed with >= 80% accuracy gets Lightning Speed
  const b2 = assignFunBadge({
    correctCount: 8,
    totalQuestions: 10,
    score: 80,
    accuracy: 80,
    timeTakenSeconds: 30, // 30s / 10 = 3s per question
  });
  assert.equal(b2.id, 'lightning_speed');
  assert.equal(b2.icon, '⚡');

  // 90% accuracy gets Elite Warrior
  const b3 = assignFunBadge({
    correctCount: 9,
    totalQuestions: 10,
    score: 90,
    accuracy: 90,
    timeTakenSeconds: 150, // not lightning fast
  });
  assert.equal(b3.id, 'elite_warrior');
  assert.equal(b3.icon, '🌟');
});

test('Google Sheets export matches required headers and formats accurately', () => {
  assert.equal(GOOGLE_SHEETS_COLUMNS[0], 'Họ và ');
  assert.equal(GOOGLE_SHEETS_COLUMNS[1], 'Tên học sinh');
  assert.equal(GOOGLE_SHEETS_COLUMNS[2], 'Thời gian');
  assert.equal(GOOGLE_SHEETS_COLUMNS[3], 'Câu trả lời đúng');
  assert.equal(GOOGLE_SHEETS_COLUMNS[4], 'Câu trả lời sai');
  assert.equal(GOOGLE_SHEETS_COLUMNS[5], 'Tổng số câu trả lời đúng');
  assert.equal(GOOGLE_SHEETS_COLUMNS[6], 'Tổng số câu trả lời sai');
  assert.equal(GOOGLE_SHEETS_COLUMNS[7], 'Điểm');

  const sampleEntry = {
    id: 'test_1',
    lastName: 'Nguyễn Văn',
    firstName: 'An',
    fullName: 'Nguyễn Văn An',
    studentClass: '3A',
    timestamp: '08/11/2026 22:00',
    createdAt: Date.now(),
    correctDetails: '1, 2, 4, 5',
    wrongDetails: '3',
    correctCount: 4,
    wrongCount: 1,
    totalQuestions: 5,
    score: 40,
    accuracy: 80,
    timeTakenSeconds: 45,
    badge: {
      id: 'algorithm_master',
      icon: '🏆',
      label: 'Bậc Thầy Thuật Toán',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      borderColor: 'border-emerald-400',
      description: 'Nắm vững kiến thức bài học!',
    },
  };

  const tsv = formatForGoogleSheetsClipboard([sampleEntry], false);
  const rows = tsv.split('\n');
  assert.equal(rows.length, 2);
  const cols = rows[1].split('\t');
  assert.equal(cols[0], 'Nguyễn Văn');
  assert.equal(cols[1], 'An');
  assert.equal(cols[2], '08/11/2026 22:00');
  assert.equal(cols[3], '1, 2, 4, 5');
  assert.equal(cols[4], '3');
  assert.equal(cols[5], '4');
  assert.equal(cols[6], '1');
  assert.equal(cols[7], '40');

  const csv = generateGoogleSheetsCsv([sampleEntry]);
  assert.ok(csv.startsWith('\uFEFF')); // UTF-8 BOM
  assert.ok(csv.includes('Nguyễn Văn,An,08/11/2026 22:00,"1, 2, 4, 5",3,4,1,40'));
});
