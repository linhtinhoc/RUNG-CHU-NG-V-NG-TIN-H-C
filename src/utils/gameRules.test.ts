import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTimeSeconds,
  shuffleArray,
  shuffleQuestionOptions,
  filterAndPrepareQuestions,
  calculateRankAndTitle,
  sortLeaderboard,
  validateQuestion,
  validateQuestionSetJSON,
} from './gameRules';
import { Question, QuestionSet, GameSettings, PlayerScore } from '../types/game';

const sampleQuestion: Question = {
  id: 'q1',
  content: 'Bộ phận nào của máy tính để bàn dùng để gõ chữ và số?',
  options: ['Màn hình', 'Bàn phím', 'Chuột', 'Thân máy'],
  correctAnswer: 1, // 'Bàn phím'
  explanation: 'Bàn phím gồm nhiều phím dùng để gõ kí tự chữ, số vào máy tính.',
  grade: 3,
  bookId: 'kn-tri-thuc',
  lessonId: 'b3',
  topic: 'Máy tính và em',
  difficulty: 'easy',
  points: 10,
  customTimeSeconds: 15,
};

const sampleSet: QuestionSet = {
  id: 'set1',
  title: 'Bộ câu hỏi Bài 3: Máy tính và em',
  grade: 3,
  bookId: 'kn-tri-thuc',
  lessonId: 'b3',
  topic: 'Máy tính và em',
  description: 'Khởi động & Luyện tập',
  defaultTimeSeconds: 20,
  questions: [
    sampleQuestion,
    {
      id: 'q2',
      content: 'Bộ phận quan trọng nhất của máy tính để bàn có chứa bộ xử lí là gì?',
      options: ['Thân máy', 'Màn hình', 'Chuột', 'Bàn phím'],
      correctAnswer: 0,
      explanation: 'Thân máy chứa bộ xử lí, ví như bộ não điều khiển máy tính.',
      grade: 3,
      bookId: 'kn-tri-thuc',
      lessonId: 'b3',
      topic: 'Máy tính và em',
      difficulty: 'medium',
      points: 10,
      customTimeSeconds: 25,
    },
    {
      id: 'q3',
      content: 'Thiết bị nào sau đây vừa có màn hình cảm ứng vừa thay thế chuột và bàn phím?',
      options: ['Máy in', 'Máy chiếu', 'Điện thoại thông minh', 'Loa máy tính'],
      correctAnswer: 2,
      explanation: 'Điện thoại thông minh và máy tính bảng có màn hình cảm ứng vừa là chuột vừa là bàn phím ảo.',
      grade: 3,
      bookId: 'kn-tri-thuc',
      lessonId: 'b3',
      topic: 'Máy tính và em',
      difficulty: 'hard',
      points: 10,
      customTimeSeconds: 30,
    },
  ],
  createdAt: '2026-10-28',
  updatedAt: '2026-10-28',
};

test('clampTimeSeconds enforces limits between 1 and 60 seconds', () => {
  assert.equal(clampTimeSeconds(5), 5);
  assert.equal(clampTimeSeconds(60), 60);
  assert.equal(clampTimeSeconds(999), 60);
  assert.equal(clampTimeSeconds(-10), 1);
  assert.equal(clampTimeSeconds(NaN, 20), 20);
});

test('shuffleQuestionOptions keeps correct answer value intact and synchronizes optionImages', () => {
  const questionWithImages: Question = {
    ...sampleQuestion,
    optionImages: ['img_screen.png', 'img_keyboard.png', 'img_mouse.png', 'img_case.png'],
  };
  const originalCorrectValue = sampleQuestion.options[sampleQuestion.correctAnswer]; // "Bàn phím"
  const originalCorrectImage = questionWithImages.optionImages![sampleQuestion.correctAnswer]; // "img_keyboard.png"

  for (let i = 0; i < 20; i++) {
    const shuffled = shuffleQuestionOptions(questionWithImages);
    assert.equal(shuffled.options.length, 4);
    assert.equal(shuffled.options[shuffled.correctAnswer], originalCorrectValue);
    assert.equal(shuffled.optionImages?.[shuffled.correctAnswer], originalCorrectImage);
  }
});

test('filterAndPrepareQuestions respects question count limits and difficulty', () => {
  const settings: GameSettings = {
    mode: 'individual',
    timeMode: 'global',
    globalTimeSeconds: 15,
    questionCount: 2,
    selectedQuestionIds: [],
    selectionMode: 'count',
    difficultyFilter: 'all',
    topicFilter: 'all',
    shuffleQuestions: false,
    shuffleOptions: false,
    pointsPerCorrect: 10,
    pointsPerWrong: 0,
    pointsPerSkip: 0,
    enableAudio: true,
    enableAnimation: true,
    enableConfetti: true,
    players: [],
    teams: [],
  };

  const prepared = filterAndPrepareQuestions(sampleSet, settings);
  assert.equal(prepared.length, 2);
  assert.equal(prepared[0].customTimeSeconds, 15);
});

test('filterAndPrepareQuestions manual selection works', () => {
  const settings: GameSettings = {
    mode: 'individual',
    timeMode: 'custom',
    globalTimeSeconds: 20,
    questionCount: 1,
    selectedQuestionIds: ['q2'],
    selectionMode: 'manual',
    difficultyFilter: 'all',
    topicFilter: 'all',
    shuffleQuestions: false,
    shuffleOptions: false,
    pointsPerCorrect: 10,
    pointsPerWrong: 0,
    pointsPerSkip: 0,
    enableAudio: true,
    enableAnimation: true,
    enableConfetti: true,
    players: [],
    teams: [],
  };

  const prepared = filterAndPrepareQuestions(sampleSet, settings);
  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].id, 'q2');
  assert.equal(prepared[0].customTimeSeconds, 25);
});

test('calculateRankAndTitle assigns proper titles based on accuracy', () => {
  assert.equal(calculateRankAndTitle(10, 10).title, 'SIÊU SAO TIN HỌC');
  assert.equal(calculateRankAndTitle(8, 10).title, 'CAO THỦ MÁY TÍNH');
  assert.equal(calculateRankAndTitle(6, 10).title, 'NHÀ KHÁM PHÁ CÔNG NGHỆ');
  assert.equal(calculateRankAndTitle(4, 10).title, 'CHIẾN BINH TRI THỨC');
  assert.equal(calculateRankAndTitle(2, 10).title, 'NGÔI SAO ĐANG TỎA SÁNG');
});

test('sortLeaderboard breaks ties correctly', () => {
  const players: PlayerScore[] = [
    { id: '1', name: 'Bình', score: 30, correctCount: 3, wrongCount: 1, unansweredCount: 0, answers: {} },
    { id: '2', name: 'An', score: 40, correctCount: 4, wrongCount: 0, unansweredCount: 0, answers: {} },
    { id: '3', name: 'Cường', score: 30, correctCount: 3, wrongCount: 1, unansweredCount: 0, answers: {} },
  ];

  const sorted = sortLeaderboard(players);
  assert.equal(sorted[0].name, 'An');
  assert.equal(sorted[1].name, 'Bình');
  assert.equal(sorted[2].name, 'Cường');
});

test('validateQuestion and validateQuestionSetJSON detect invalid data', () => {
  const valid = validateQuestion(sampleQuestion);
  assert.equal(valid.isValid, true);

  const invalidTime = validateQuestion({ ...sampleQuestion, customTimeSeconds: 99 });
  assert.equal(invalidTime.isValid, false);

  const invalidOptions = validateQuestion({ ...sampleQuestion, options: ['A', 'B'] });
  assert.equal(invalidOptions.isValid, false);

  const setValidation = validateQuestionSetJSON(sampleSet);
  assert.equal(setValidation.isValid, true);
});
