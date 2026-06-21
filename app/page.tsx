'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';

interface Stats {
  totalWords: number;
  totalSessions: number;
  overallAccuracy: number;
  weakWords: { id: number; japanese: string; korean: string; total_correct: number; total_attempts: number }[];
  currentRound: number;
  cooldownWords: number;
  categoryStats: { category: string; count: number; accuracy: number }[];
  cycleSeenCount: number;
  totalRoundsInCycle: number;
}

export default function Home() {
  const { user, loading: userLoading, login } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setStatsLoading(true);
    fetch(`/api/stats?user_id=${user.user_id}`)
      .then(r => r.json())
      .then(data => { setStats(data); setStatsLoading(false); })
      .catch(() => setStatsLoading(false));
  }, [user]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    const result = await login(username.trim());
    if (!result.ok) setLoginError(result.error ?? '오류가 발생했습니다.');
    setLoginLoading(false);
  }

  // Loading
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-600 text-sm">불러오는 중...</div>
      </div>
    );
  }

  // Not logged in — show login form
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-5xl">🌸</span>
            <h1 className="text-2xl font-bold text-white mt-3">일본어 퀴즈</h1>
            <p className="text-slate-500 text-sm mt-1">닉네임을 입력해서 시작하세요</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="닉네임 입력"
              maxLength={20}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 text-center text-lg"
              autoFocus
            />
            {loginError && <p className="text-rose-400 text-sm text-center">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading || !username.trim()}
              className="w-full bg-pink-500 hover:bg-pink-400 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loginLoading ? '확인 중...' : '시작하기'}
            </button>
          </form>
          <p className="text-slate-600 text-xs text-center mt-4">
            기존에 쓰던 닉네임을 입력하면 이어서 진행됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-white">안녕하세요, {user.username} 님</h1>
          <p className="text-slate-500 text-sm mt-0.5">꾸준히 공부해서 일본어 마스터</p>
        </div>
        <span className="text-2xl">🌸</span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/quiz"
          className="relative overflow-hidden bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white rounded-2xl p-5 transition-all active:scale-[0.98] shadow-lg shadow-pink-900/30"
        >
          <div className="text-3xl mb-2">🎯</div>
          <div className="font-bold text-base leading-tight">퀴즈 시작</div>
          <div className="text-pink-200 text-xs mt-1">
            {user.current_round > 0 ? `Round ${user.current_round + 1} 이어하기` : '랜덤 10문항'}
          </div>
        </Link>
        <Link
          href="/words"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl p-5 transition-all active:scale-[0.98]"
        >
          <div className="text-3xl mb-2">📖</div>
          <div className="font-bold text-base leading-tight">단어장</div>
          <div className="text-slate-400 text-xs mt-1">추가 · 수정 · 삭제</div>
        </Link>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="text-center py-8 text-slate-600 text-sm">불러오는 중...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.totalWords}</div>
              <div className="text-xs text-slate-500 mt-1">등록 단어</div>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{stats.totalSessions}</div>
              <div className="text-xs text-slate-500 mt-1">완료 퀴즈</div>
            </div>
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.overallAccuracy}%</div>
              <div className="text-xs text-slate-500 mt-1">정답률</div>
            </div>
          </div>

          {/* Round progress */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">사이클 진행</span>
              <span className="text-xs text-slate-500">
                {stats.cycleSeenCount}/{stats.totalWords}단어
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-pink-500 rounded-full transition-all"
                style={{ width: stats.totalWords > 0 ? `${(stats.cycleSeenCount / stats.totalWords) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Round {stats.currentRound}</span>
              <span>
                {stats.cooldownWords > 0 && `쿨다운 ${stats.cooldownWords}개 · `}
                총 {stats.totalRoundsInCycle}라운드/사이클
              </span>
            </div>
          </div>

          {/* Weak words */}
          {stats.weakWords.length > 0 && (
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full" />
                취약 단어
              </h2>
              <div className="space-y-0">
                {stats.weakWords.map(word => {
                  const accuracy = word.total_attempts > 0
                    ? Math.round((word.total_correct / word.total_attempts) * 100)
                    : 0;
                  return (
                    <div key={word.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0">
                      <div>
                        <span className="font-medium text-white text-sm">{word.japanese}</span>
                        <span className="text-slate-500 text-xs mx-2">·</span>
                        <span className="text-slate-400 text-sm">{word.korean}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        accuracy < 30 ? 'bg-rose-500/10 text-rose-400' :
                        accuracy < 60 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>{accuracy}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category stats */}
          {stats.categoryStats.length > 0 && (
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-violet-500 rounded-full" />
                카테고리별 정답률
              </h2>
              <div className="space-y-3">
                {stats.categoryStats.map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 w-20 truncate">{cat.category}</span>
                    <div className="flex-1 bg-slate-700/50 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          cat.accuracy >= 70 ? 'bg-emerald-400' :
                          cat.accuracy >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                        style={{ width: `${cat.accuracy}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right shrink-0">
                      {cat.count}개 · {cat.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.totalWords === 0 && (
            <div className="bg-slate-800 border border-slate-700/50 border-dashed rounded-xl p-6 text-center">
              <p className="text-slate-400 text-sm">아직 등록된 단어가 없어요</p>
              <Link href="/words" className="text-pink-400 text-sm mt-2 inline-block hover:text-pink-300">
                단어 추가하러 가기 →
              </Link>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
