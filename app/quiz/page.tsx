'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Word } from '@/lib/types';

type Phase = 'idle' | 'quizzing' | 'done';

interface QuizWord extends Word {
  isCorrect: boolean | null;
}

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState<QuizWord[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [round, setRound] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [finalScore, setFinalScore] = useState<{ correct: number; total: number } | null>(null);

  async function startQuiz() {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/quiz/start');
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setWords(data.words.map((w: Word) => ({ ...w, isCorrect: null })));
      setSessionId(data.session_id);
      setRound(data.round);
      setCurrentIndex(0);
      setRevealed(false);
      setFinalScore(null);
      setPhase('quizzing');
      if (data.warning) setWarning(data.warning);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(correct: boolean) {
    const newWords = words.map((w, i) => i === currentIndex ? { ...w, isCorrect: correct } : w);
    setWords(newWords);

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
    } else {
      submitQuiz(newWords);
    }
  }

  async function submitQuiz(finalWords: QuizWord[]) {
    if (!sessionId) return;
    setSubmitting(true);
    const answers = finalWords.map(w => ({
      word_id: w.id,
      user_answer: '',
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
      setSubmitting(false);
    }
  }

  const currentWord = words[currentIndex];

  if (phase === 'idle') {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-white">퀴즈</h1>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
            {error}
            {error.includes('단어가 없습니다') && (
              <Link href="/words" className="block mt-2 text-rose-300 underline">
                단어 추가하러 가기 →
              </Link>
            )}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-pink-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">🎯</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">랜덤 10문항</h2>
          <p className="text-slate-400 text-sm mb-6">
            카드를 보고 일본어를 떠올린 뒤<br />정답을 확인하고 직접 체크하세요
          </p>
          <ul className="text-left bg-slate-900 rounded-xl p-4 text-sm text-slate-400 mb-6 space-y-2">
            <li>• 한국어 의미를 보고 일본어를 떠올리세요</li>
            <li>• <span className="text-slate-300">정답 보기</span> 를 눌러 정답을 확인하세요</li>
            <li>• <span className="text-emerald-400">○ 알았다</span> / <span className="text-rose-400">✕ 몰랐다</span> 로 직접 체크</li>
            <li>• 틀린 단어는 한 라운드 건너뛰고 재출제</li>
          </ul>
          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-400 active:bg-pink-600 text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-50"
          >
            {loading ? '준비 중...' : '퀴즈 시작'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'quizzing') {
    if (submitting) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="text-5xl animate-bounce">🌸</div>
          <p className="text-slate-400">결과 저장 중...</p>
        </div>
      );
    }

    if (!currentWord) return null;

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Round {round}</span>
          <span className="text-sm font-semibold text-white">{currentIndex + 1} <span className="text-slate-500">/ {words.length}</span></span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentIndex / words.length) * 100}%` }}
          />
        </div>

        {/* Dot indicators */}
        <div className="flex gap-1.5 justify-center">
          {words.map((w, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-5 h-2 bg-pink-400'
                  : w.isCorrect === true
                  ? 'w-2 h-2 bg-emerald-400'
                  : w.isCorrect === false
                  ? 'w-2 h-2 bg-rose-400'
                  : 'w-2 h-2 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          {/* Card top */}
          <div className="p-6 pb-0">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs bg-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                {currentWord.category}
              </span>
            </div>

            <div className="text-center py-6">
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">이 단어의 일본어는?</p>
              <p className="text-4xl font-bold text-white">{currentWord.korean}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 mx-6 my-2" />

          {/* Answer area */}
          <div className="p-6 pt-4">
            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-3.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-600 text-slate-200 font-medium rounded-xl transition-colors"
              >
                정답 보기
              </button>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white mb-1">{currentWord.japanese}</p>
                  {currentWord.reading && (
                    <p className="text-slate-400">{currentWord.reading}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleAnswer(false)}
                    className="py-4 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 border border-rose-500/20 font-bold rounded-xl transition-colors"
                  >
                    <span className="text-2xl">✕</span>
                    <span className="block text-xs font-normal mt-1 text-rose-400/70">몰랐다</span>
                  </button>
                  <button
                    onClick={() => handleAnswer(true)}
                    className="py-4 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 font-bold rounded-xl transition-colors"
                  >
                    <span className="text-2xl">○</span>
                    <span className="block text-xs font-normal mt-1 text-emerald-400/70">알았다</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {warning && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
            ⚠ {warning}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'done' && finalScore) {
    const pct = Math.round((finalScore.correct / finalScore.total) * 100);
    const wrongWords = words.filter(w => w.isCorrect === false);
    const correctWords = words.filter(w => w.isCorrect === true);

    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-white">퀴즈 결과</h1>

        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center border ${
          pct >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' :
          pct >= 60 ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-rose-500/10 border-rose-500/20'
        }`}>
          <div className={`text-7xl font-bold mb-2 ${
            pct >= 80 ? 'text-emerald-400' :
            pct >= 60 ? 'text-amber-400' :
            'text-rose-400'
          }`}>
            {pct}<span className="text-4xl">%</span>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            {finalScore.correct} / {finalScore.total} 정답
          </p>
          <p className="text-slate-200 text-sm">
            {pct >= 80 ? '훌륭해요! 이 기세로 계속!' :
             pct >= 60 ? '잘하고 있어요. 조금만 더!' :
             '틀린 단어를 다시 복습해봐요'}
          </p>
        </div>

        {/* Correct / Wrong count */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{correctWords.length}</div>
            <div className="text-xs text-slate-500 mt-1">맞힌 단어</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-rose-400">{wrongWords.length}</div>
            <div className="text-xs text-slate-500 mt-1">틀린 단어</div>
          </div>
        </div>

        {/* Wrong words */}
        {wrongWords.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-rose-400">틀린 단어</h2>
              <span className="text-xs text-slate-500">다음 라운드 재출제</span>
            </div>
            <div className="space-y-0">
              {wrongWords.map((word, i) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0"
                >
                  <div>
                    <span className="font-medium text-white">{word.japanese}</span>
                    {word.reading && (
                      <span className="text-xs text-slate-500 ml-2">({word.reading})</span>
                    )}
                  </div>
                  <span className="text-slate-400 text-sm">{word.korean}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wrongWords.length === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
            <p className="text-emerald-400 font-semibold">만점!</p>
            <p className="text-slate-400 text-sm mt-1">모든 단어를 알고 있어요 🎊</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={startQuiz}
            disabled={loading}
            className="flex-1 bg-pink-500 hover:bg-pink-400 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? '준비 중...' : '다시 시작'}
          </button>
          <Link
            href="/"
            className="px-6 py-4 bg-slate-800 border border-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors whitespace-nowrap"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
