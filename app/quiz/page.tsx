'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { Word } from '@/lib/types';

type Phase = 'idle' | 'quizzing' | 'done';

interface QuizWord extends Word {
  revealed: boolean;
  isCorrect: boolean | null;
}

interface SavedQuizSession {
  phase: 'quizzing';
  words: QuizWord[];
  sessionId: number;
  round: number;
  totalWords: number;
  cycleSeenCount: number;
  warning: string;
}

function quizKey(userId: number) {
  return `quiz_session_${userId}`;
}

export default function QuizPage() {
  const { user, refreshUser } = useUser();
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState<QuizWord[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [round, setRound] = useState<number>(0);
  const [totalWords, setTotalWords] = useState(0);
  const [cycleSeenCount, setCycleSeenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [finalScore, setFinalScore] = useState<{ correct: number; total: number } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restore saved session from localStorage on mount
  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(quizKey(user.user_id));
      if (saved) {
        const session: SavedQuizSession = JSON.parse(saved);
        setWords(session.words);
        setSessionId(session.sessionId);
        setRound(session.round);
        setTotalWords(session.totalWords);
        setCycleSeenCount(session.cycleSeenCount);
        setWarning(session.warning || '');
        setPhase('quizzing');
        setRestored(true);
      }
    } catch {
      localStorage.removeItem(quizKey(user.user_id));
    }
  }, [user]);

  // Save quiz state to localStorage whenever it changes during quizzing
  useEffect(() => {
    if (!user || phase !== 'quizzing') return;
    const session: SavedQuizSession = {
      phase: 'quizzing',
      words,
      sessionId: sessionId!,
      round,
      totalWords,
      cycleSeenCount,
      warning,
    };
    localStorage.setItem(quizKey(user.user_id), JSON.stringify(session));
  }, [phase, words, sessionId, round, totalWords, cycleSeenCount, warning, user]);

  const clearSavedSession = useCallback(() => {
    if (user) localStorage.removeItem(quizKey(user.user_id));
  }, [user]);

  async function startQuiz() {
    if (!user) return;
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch(`/api/quiz/start?user_id=${user.user_id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setWords(data.words.map((w: Word) => ({ ...w, revealed: false, isCorrect: null })));
      setSessionId(data.session_id);
      setRound(data.round);
      setTotalWords(data.total_words);
      setCycleSeenCount(data.cycle_seen_count);
      setFinalScore(null);
      setRestored(false);
      setPhase('quizzing');
      if (data.warning) setWarning(data.warning);
    } finally {
      setLoading(false);
    }
  }

  function revealWord(idx: number) {
    setWords(prev => prev.map((w, i) => i === idx ? { ...w, revealed: true } : w));
  }

  function markWord(idx: number, correct: boolean) {
    setWords(prev => prev.map((w, i) => i === idx ? { ...w, isCorrect: correct } : w));
  }

  async function submitQuiz() {
    if (!user || !sessionId) return;
    setSubmitting(true);
    const answers = words.map(w => ({
      word_id: w.id,
      is_correct: w.isCorrect === true,
    }));
    try {
      const res = await fetch('/api/quiz/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_id: user.user_id, answers }),
      });
      const data = await res.json();
      if (res.ok) {
        clearSavedSession();
        setFinalScore({ correct: data.correct_count, total: data.total });
        setPhase('done');
        await refreshUser();
      } else {
        setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function abandonQuiz() {
    clearSavedSession();
    setPhase('idle');
    setWords([]);
    setSessionId(null);
    setShowAbandonConfirm(false);
    setRestored(false);
  }

  async function resetRound() {
    if (!user) return;
    setResetting(true);
    clearSavedSession();
    try {
      await fetch('/api/quiz/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id }),
      });
      await refreshUser();
      setPhase('idle');
      setShowResetConfirm(false);
    } finally {
      setResetting(false);
    }
  }

  const checkedCount = words.filter(w => w.isCorrect !== null).length;
  const allChecked = words.length > 0 && checkedCount === words.length;
  const correctCount = words.filter(w => w.isCorrect === true).length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-slate-400 mb-4">퀴즈를 시작하려면 로그인이 필요합니다</p>
          <Link href="/" className="text-pink-400 hover:text-pink-300">홈으로 가서 로그인 →</Link>
        </div>
      </div>
    );
  }

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    const totalRounds = user.total_words > 0 ? Math.ceil(user.total_words / 10) : 0;

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">퀴즈</h1>
          <span className="text-sm text-slate-500">{user.username}</span>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
            {error}
            {error.includes('단어가 없습니다') && (
              <Link href="/words" className="block mt-2 text-rose-300 underline">단어 추가하러 가기 →</Link>
            )}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs mb-1">현재 진행 상황</p>
              <p className="text-white font-bold text-lg">
                Round {user.current_round}
                {totalRounds > 0 && <span className="text-slate-500 font-normal text-sm ml-1">/ 사이클 {totalRounds}라운드</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs mb-1">이번 사이클</p>
              <p className="text-white font-bold">
                {user.cycle_seen_count ?? 0}
                <span className="text-slate-500 font-normal text-sm"> / {user.total_words}개</span>
              </p>
            </div>
          </div>

          {user.total_words > 0 && (
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-5">
              <div
                className="h-full bg-pink-500 rounded-full transition-all"
                style={{ width: `${((user.cycle_seen_count ?? 0) / user.total_words) * 100}%` }}
              />
            </div>
          )}

          <ul className="text-sm text-slate-400 space-y-1.5 mb-6">
            <li>• 10개 단어가 한번에 출제됩니다</li>
            <li>• <span className="text-slate-300">정답 보기</span>를 눌러 정답을 확인하세요</li>
            <li>• <span className="text-emerald-400">○ 알았다</span> / <span className="text-rose-400">✕ 몰랐다</span>로 직접 체크</li>
            <li>• 틀린 단어는 2라운드 후에 재출제됩니다</li>
          </ul>

          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-50"
          >
            {loading ? '준비 중...' : user.current_round === 0 ? '퀴즈 시작' : `Round ${user.current_round + 1} 시작`}
          </button>
        </div>

        {user.current_round > 0 && (
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            {showResetConfirm ? (
              <div>
                <p className="text-slate-300 text-sm mb-3">모든 진행상황이 초기화됩니다. 계속하시겠어요?</p>
                <div className="flex gap-2">
                  <button
                    onClick={resetRound}
                    disabled={resetting}
                    className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {resetting ? '초기화 중...' : '초기화'}
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                처음부터 다시 시작 →
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Quizzing ──────────────────────────────────────────────────────────────
  if (phase === 'quizzing') {
    if (submitting) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <div className="text-4xl animate-bounce">🌸</div>
          <p className="text-slate-400 text-sm">결과 저장 중...</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Round {round}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              이번 사이클 {cycleSeenCount}/{totalWords}개 완료
              {restored && <span className="text-amber-400 ml-1">· 이어하기 중</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{checkedCount}/{words.length}</span>
            <button
              onClick={() => setShowAbandonConfirm(true)}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              포기
            </button>
          </div>
        </div>

        {showAbandonConfirm && (
          <div className="bg-slate-800 border border-amber-500/20 rounded-xl p-4">
            <p className="text-slate-300 text-sm mb-3">이 라운드를 포기하면 진행 중인 데이터가 사라집니다.</p>
            <div className="flex gap-2">
              <button
                onClick={abandonQuiz}
                className="flex-1 py-2 bg-amber-500/20 text-amber-400 text-sm font-medium rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                포기하고 나가기
              </button>
              <button
                onClick={() => setShowAbandonConfirm(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-600 transition-colors"
              >
                계속 풀기
              </button>
            </div>
          </div>
        )}

        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 rounded-full transition-all duration-300"
            style={{ width: `${(checkedCount / words.length) * 100}%` }}
          />
        </div>

        {warning && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-400">
            ⚠ {warning}
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {words.map((word, idx) => (
            <div
              key={word.id}
              className={`bg-slate-800 rounded-xl border transition-colors ${
                word.isCorrect === true ? 'border-emerald-500/40' :
                word.isCorrect === false ? 'border-rose-500/40' :
                word.revealed ? 'border-slate-600' : 'border-slate-700'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-md">{idx + 1}번</span>
                  <span className="text-xs text-slate-600">{word.category}</span>
                  {word.isCorrect === true && <span className="ml-auto text-emerald-400 text-sm font-bold">○</span>}
                  {word.isCorrect === false && <span className="ml-auto text-rose-400 text-sm font-bold">✕</span>}
                </div>

                <p className="text-white font-semibold text-lg mb-3">{word.korean}</p>

                {!word.revealed ? (
                  <button
                    onClick={() => revealWord(idx)}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    정답 보기
                  </button>
                ) : (
                  <div>
                    <div className="py-2 mb-3">
                      <span className="text-xl font-bold text-white">{word.japanese}</span>
                      {word.reading && <span className="text-slate-400 text-sm ml-2">{word.reading}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => markWord(idx, false)}
                        className={`py-2.5 font-bold rounded-lg text-sm transition-colors ${
                          word.isCorrect === false
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
                        }`}
                      >
                        ✕ 몰랐다
                      </button>
                      <button
                        onClick={() => markWord(idx, true)}
                        className={`py-2.5 font-bold rounded-lg text-sm transition-colors ${
                          word.isCorrect === true
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'
                        }`}
                      >
                        ○ 알았다
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-20 md:bottom-4 pt-2">
          <button
            onClick={submitQuiz}
            disabled={!allChecked}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
              allChecked
                ? 'bg-pink-500 hover:bg-pink-400 text-white shadow-lg shadow-pink-900/30'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            {allChecked
              ? `결과 저장 (${correctCount}/${words.length} 정답)`
              : `${words.length - checkedCount}개 더 체크해주세요`}
          </button>
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done' && finalScore) {
    const pct = Math.round((finalScore.correct / finalScore.total) * 100);
    const wrongWords = words.filter(w => w.isCorrect === false);

    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold text-white">Round {round} 결과</h1>

        <div className={`rounded-2xl p-8 text-center border ${
          pct >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' :
          pct >= 60 ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-rose-500/10 border-rose-500/20'
        }`}>
          <div className={`text-7xl font-bold mb-2 ${
            pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {pct}<span className="text-4xl">%</span>
          </div>
          <p className="text-slate-400 text-sm">{finalScore.correct} / {finalScore.total} 정답</p>
          <p className="text-slate-200 text-sm mt-2">
            {pct >= 80 ? '훌륭해요!' : pct >= 60 ? '잘하고 있어요!' : '틀린 단어를 복습해봐요'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{finalScore.correct}</div>
            <div className="text-xs text-slate-500 mt-1">맞힌 단어</div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-rose-400">{wrongWords.length}</div>
            <div className="text-xs text-slate-500 mt-1">틀린 단어 (2라운드 후 재출제)</div>
          </div>
        </div>

        {wrongWords.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-rose-400 mb-3">틀린 단어</h2>
            <div className="space-y-0">
              {wrongWords.map(word => (
                <div key={word.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/40 last:border-0">
                  <div>
                    <span className="font-medium text-white">{word.japanese}</span>
                    {word.reading && <span className="text-xs text-slate-500 ml-1.5">({word.reading})</span>}
                  </div>
                  <span className="text-slate-400 text-sm">{word.korean}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {wrongWords.length === 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-emerald-400 font-semibold">만점!</p>
            <p className="text-slate-400 text-sm mt-1">모든 단어를 알고 있어요 🎊</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setPhase('idle')}
            className="flex-1 bg-pink-500 hover:bg-pink-400 text-white font-bold py-4 rounded-xl transition-colors"
          >
            다음 라운드
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
