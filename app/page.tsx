'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalWords: number;
  totalSessions: number;
  overallAccuracy: number;
  weakWords: { id: number; japanese: string; korean: string; total_correct: number; total_attempts: number }[];
  currentRound: number;
  cooldownWords: number;
  categoryStats: { category: string; count: number; accuracy: number }[];
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🌸</span>
          <h1 className="text-2xl font-bold text-white">일본어 퀴즈</h1>
        </div>
        <p className="text-slate-500 text-sm pl-1">꾸준히 공부해서 일본어 마스터</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/quiz"
          className="relative overflow-hidden bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white rounded-2xl p-5 transition-all active:scale-[0.98] shadow-lg shadow-pink-900/30"
        >
          <div className="text-3xl mb-3">🎯</div>
          <div className="font-bold text-lg leading-tight">퀴즈 시작</div>
          <div className="text-pink-200 text-xs mt-1">랜덤 10문항</div>
          <div className="absolute -right-3 -bottom-3 text-6xl opacity-10 rotate-12">🎯</div>
        </Link>
        <Link
          href="/words"
          className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl p-5 transition-all active:scale-[0.98]"
        >
          <div className="text-3xl mb-3">📖</div>
          <div className="font-bold text-lg leading-tight">단어장</div>
          <div className="text-slate-400 text-xs mt-1">추가 · 수정 · 삭제</div>
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-slate-600 text-sm">불러오는 중...</div>
        </div>
      ) : stats ? (
        <>
          {/* Numbers */}
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

          {/* Round & Cooldown */}
          <div className="flex items-center justify-between bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <span className="text-amber-400 text-sm font-bold">R</span>
              </div>
              <div>
                <span className="text-white font-semibold text-sm">Round {stats.currentRound}</span>
                {stats.cooldownWords > 0 && (
                  <span className="text-slate-500 text-xs ml-2">쿨다운 {stats.cooldownWords}개</span>
                )}
              </div>
            </div>
            <Link href="/history" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              전체 통계 →
            </Link>
          </div>

          {/* Weak words */}
          {stats.weakWords.length > 0 && (
            <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full inline-block" />
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
                <span className="w-2 h-2 bg-violet-500 rounded-full inline-block" />
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
                          cat.accuracy >= 40 ? 'bg-amber-400' :
                          'bg-rose-400'
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
