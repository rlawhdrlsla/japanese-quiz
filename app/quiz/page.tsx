'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Word } from '@/lib/types';

type Phase = 'idle' | 'answering' | 'checking' | 'done';

interface QuizWord extends Word {
  userAnswer: string;
  isCorrect: boolean | null;
}

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState<QuizWord[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [round, setRound] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [finalScore, setFinalScore] = useState<{ correct: number; total: number } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function startQuiz() {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/quiz/start');
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setWords(data.words.map((w: Word) => ({ ...w, userAnswer: '', isCorrect: null })));
      setSessionId(data.session_id);
      setRound(data.round);
      setCurrentIndex(0);
      setFinalScore(null);
      setPhase('answering');
      if (data.warning) setWarning(data.warning);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(idx: number, value: string) {
    setWords(prev => prev.map((w, i) => i === idx ? { ...w, userAnswer: value } : w));
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx < words.length - 1) {
        inputRefs.current[idx + 1]?.focus();
        setCurrentIndex(idx + 1);
      } else {
        submitAnswers();
      }
    }
  }

  function submitAnswers() {
    setPhase('checking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleCorrect(idx: number, correct: boolean) {
    setWords(prev => prev.map((w, i) => i === idx ? { ...w, isCorrect: correct } : w));
  }

  async function finishQuiz() {
    if (!sessionId) return;
    setLoading(true);

    const answers = words.map(w => ({
      word_id: w.id,
      user_answer: w.userAnswer,
      is_correct: w.isCorrect === true,
    }));

    try {
      const res = await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answers }),
      });
      const data = await res.json();
      if (res.ok) {
        setFinalScore({ correct: data.correct_count, total: data.total });
        setPhase('done');
      }
    } finally {
      setLoading(false);
    }
  }

  const allAnswered = words.length > 0 && words.every(w => w.userAnswer.trim() !== '');
  const allChecked = words.length > 0 && words.every(w => w.isCorrect !== null);
  const correctCount = words.filter(w => w.isCorrect === true).length;

  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">✏️ 퀴즈</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            {error}
            {error.includes('단어가 없습니다') && (
              <Link href="/words" className="block mt-2 text-red-500 underline text-sm">
                → 단어 추가하러 가기
              </Link>
            )}
          </div>
        )}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">랜덤 10문항 퀴즈</h2>
          <p className="text-gray-500 text-sm mb-6">
            한국어로 문제가 출제됩니다.<br />
            일본어로 답을 입력하세요.
          </p>
          <div className="bg-pink-50 rounded-xl p-4 text-left text-sm text-gray-600 mb-6 space-y-2">
            <p>📌 모든 답안 입력 후 제출하면 정답이 공개됩니다</p>
            <p>📌 직접 O / X 체크를 하면 결과가 저장됩니다</p>
            <p>📌 틀린 단어는 다음 라운드를 건너뛰고 그 다음에 다시 출제됩니다</p>
          </div>
          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-50"
          >
            {loading ? '준비 중...' : '퀴즈 시작! 🌸'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'answering') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">✏️ 퀴즈 중</h1>
          <span className="text-sm text-gray-400">Round {round}</span>
        </div>

        {warning && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            ⚠️ {warning}
          </div>
        )}

        <p className="text-sm text-gray-500">
          {words.filter(w => w.userAnswer.trim()).length} / {words.length} 입력 완료
          <span className="ml-2 text-gray-300">· Enter로 다음 문제</span>
        </p>

        {/* Progress bar */}
        <div className="bg-gray-100 rounded-full h-2">
          <div
            className="bg-pink-400 h-2 rounded-full transition-all"
            style={{ width: `${(words.filter(w => w.userAnswer.trim()).length / words.length) * 100}%` }}
          />
        </div>

        <div className="space-y-3">
          {words.map((word, idx) => (
            <div
              key={word.id}
              className={`bg-white rounded-xl p-4 shadow-sm border transition-colors ${
                currentIndex === idx ? 'border-pink-400 shadow-pink-100' : 'border-pink-50'
              }`}
              onClick={() => { setCurrentIndex(idx); inputRefs.current[idx]?.focus(); }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">
                  {idx + 1}번
                </span>
                <span className="text-xs text-gray-400">{word.category}</span>
              </div>
              <p className="font-semibold text-gray-800 text-lg mb-3">{word.korean}</p>
              <input
                ref={el => { inputRefs.current[idx] = el; }}
                type="text"
                value={word.userAnswer}
                onChange={e => handleAnswerChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(e, idx)}
                onFocus={() => setCurrentIndex(idx)}
                placeholder="일본어로 입력하세요..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-pink-400"
              />
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 pt-2">
          <button
            onClick={submitAnswers}
            disabled={!allAnswered}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              allAnswered
                ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {allAnswered ? '정답 확인하기 →' : `아직 ${words.length - words.filter(w => w.userAnswer.trim()).length}개 남았어요`}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'checking') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">정답 확인</h1>
          <span className="text-sm font-medium text-pink-600">
            {correctCount} / {words.length}
          </span>
        </div>

        <div className="bg-pink-50 rounded-xl p-3 text-sm text-gray-600">
          각 문제에서 O / X 버튼을 눌러 맞고 틀림을 직접 체크해주세요.
        </div>

        <div className="space-y-3">
          {words.map((word, idx) => (
            <div
              key={word.id}
              className={`bg-white rounded-xl p-4 shadow-sm border-2 transition-all ${
                word.isCorrect === true
                  ? 'border-emerald-300 bg-emerald-50'
                  : word.isCorrect === false
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{idx + 1}번</span>
                  </div>
                  <p className="text-gray-500 text-sm">{word.korean}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-400 w-12">내 답:</span>
                      <span className={`font-medium ${
                        word.isCorrect === true ? 'text-emerald-700' : word.isCorrect === false ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {word.userAnswer || '(미입력)'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-gray-400 w-12">정답:</span>
                      <span className="font-bold text-gray-800">{word.japanese}</span>
                      {word.reading && (
                        <span className="text-xs text-gray-400">({word.reading})</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 pt-1">
                  <button
                    onClick={() => toggleCorrect(idx, true)}
                    className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${
                      word.isCorrect === true
                        ? 'bg-emerald-500 text-white scale-110 shadow-md'
                        : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                    }`}
                  >
                    O
                  </button>
                  <button
                    onClick={() => toggleCorrect(idx, false)}
                    className={`w-12 h-12 rounded-xl font-bold text-lg transition-all ${
                      word.isCorrect === false
                        ? 'bg-red-500 text-white scale-110 shadow-md'
                        : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                    }`}
                  >
                    X
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-4 pt-2">
          <button
            onClick={finishQuiz}
            disabled={!allChecked || loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              allChecked && !loading
                ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? '저장 중...' : allChecked ? '결과 저장하기 →' : `아직 ${words.filter(w => w.isCorrect === null).length}개 체크 안함`}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'done' && finalScore) {
    const pct = Math.round((finalScore.correct / finalScore.total) * 100);
    const wrongWords = words.filter(w => w.isCorrect === false);

    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">결과</h1>

        <div className={`rounded-2xl p-6 text-center ${
          pct >= 80 ? 'bg-emerald-50 border-2 border-emerald-200' :
          pct >= 60 ? 'bg-yellow-50 border-2 border-yellow-200' :
          'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="text-5xl mb-3">
            {pct >= 80 ? '🎉' : pct >= 60 ? '😊' : '💪'}
          </div>
          <div className={`text-5xl font-bold mb-2 ${
            pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {finalScore.correct} / {finalScore.total}
          </div>
          <div className="text-2xl font-semibold text-gray-600">{pct}%</div>
          <p className="text-gray-500 text-sm mt-3">
            {pct >= 80 ? '훌륭해요! 계속 이 기세로! 🌸' :
             pct >= 60 ? '좋아요! 조금만 더 힘내요!' :
             '틀린 단어를 다시 복습해봐요!'}
          </p>
        </div>

        {wrongWords.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
            <h2 className="font-bold text-red-600 mb-3">❌ 틀린 단어 ({wrongWords.length}개)</h2>
            <p className="text-xs text-gray-400 mb-3">이 단어들은 다음 라운드를 건너뛰고 그 다음 라운드에 다시 출제됩니다.</p>
            <div className="space-y-2">
              {wrongWords.map(word => (
                <div key={word.id} className="flex items-baseline justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <span className="font-medium text-gray-800">{word.japanese}</span>
                    {word.reading && <span className="text-xs text-gray-400 ml-1">({word.reading})</span>}
                    <span className="text-gray-400 mx-2">→</span>
                    <span className="text-gray-600">{word.korean}</span>
                  </div>
                  <span className="text-xs text-red-400 shrink-0">내 답: {word.userAnswer || '미입력'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wrongWords.length === 0 && (
          <div className="bg-emerald-50 rounded-2xl p-4 text-center text-emerald-700 border border-emerald-200">
            🎊 만점! 모든 단어를 정확히 알고 있어요!
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={startQuiz}
            disabled={loading}
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl transition-colors"
          >
            {loading ? '준비 중...' : '다시 퀴즈 시작'}
          </button>
          <Link
            href="/"
            className="px-6 py-4 bg-white border border-pink-200 text-pink-600 font-medium rounded-xl hover:bg-pink-50 transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
