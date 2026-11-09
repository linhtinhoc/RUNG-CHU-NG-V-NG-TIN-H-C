import test from 'node:test';
import assert from 'node:assert/strict';
import { saveQuestionToBackend, fetchSavedQuestions } from './questionsApi';

test('questionsApi exports valid typed functions', () => {
  assert.equal(typeof saveQuestionToBackend, 'function');
  assert.equal(typeof fetchSavedQuestions, 'function');
});
