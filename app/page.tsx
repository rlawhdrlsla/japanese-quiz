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
    <div className="space-y-6">
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-pink-700">🌸 일본어 퀴즈</h1>
        <p className="text-gray-500 mt-1 text-sm">꾸준히 공부해서 일본어 마스터!</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/quiz"
          className="bg-pink-500 hover:bg-pink-600 text-white rounded-2xl p-6 text-center transition-colors shadow-md"
        >
          <div className="text-4xl mb-2">✏️</div>
          <div className="font-bold text-lg">퀴즈 시작</div>
          <div className="text-pink-100 text-sm mt-1">랜덤 10문항</div>
        </Link>
        <Link
          href="/words"
          className="bg-white hover:bg-pink-50 text-pink-700 border-2 border-pink-200 rounded-2xl p-6 text-center transition-colors shadow-sm"
        >
          <div className="text-4xl mb-2">📖</div>
          <div className="font-bold text-lg">단어 관리</div>
          <div className="text-gray-400 text-sm mt-1">추가 / 수정 / 삭제</div>
        </Link>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">불러오는 중...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-pink-100">
              <div className="text-2xl font-bold text-pink-600">{stats.totalWords}</div>
              <div className="text-xs text-gray-500 mt-1">등록 단어</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-pink-100">
              <div className="text-2xl font-bold text-purple-600">{stats.totalSessions}</div>
              <div className="text-xs text-gray-500 mt-1">완료 퀴즈</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-pink-100">
              <div className="text-2xl font-bold text-emerald-600">{stats.overallAccuracy}%</div>
              <div className="text-xs text-gray-500 mt-1">전체 정답률</div>
            </div>
          </div>

          {/* Weak Words */}
          {stats.weakWords.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
              <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>🔴</span> 취약 단어 (정답률 낮은 순)
              </h2>
              <div className="space-y-2">
                {stats.weakWords.map(word => {
                  const accuracy = word.total_attempts > 0
                    ? Math.round((word.total_correct / word.total_attempts) * 100)
                    : 0;
                  return (
                    <div key={word.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="font-medium text-gray-800">{word.japanese}</span>
                        <span className="text-gray-400 mx-2">→</span>
                        <span className="text-gray-600">{word.korean}</span>
                      </div>
                      <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                        accuracy < 30 ? 'bg-red-100 text-red-600' :
                        accuracy < 60 ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>{accuracy}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Stats */}
          {stats.categoryStats.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
              <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>📂</span> 카테고리별 현황
              </h2>
              <div className="space-y-2">
                {stats.categoryStats.map(cat => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20 truncate">{cat.category}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-pink-400 h-2 rounded-full transition-all"
                        style={{ width: `${cat.accuracy}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{cat.count}개 · {cat.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.cooldownWords > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              💤 현재 <strong>{stats.cooldownWords}개</strong> 단어가 쿨다운 중입니다. (다음 라운드 건너뛰기)
            </div>
          )}

          {stats.totalWords === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <p className="text-blue-700 font-medium">아직 단어가 없어요!</p>
              <Link href="/words" className="text-blue-500 underline text-sm mt-1 inline-block">
                단어 추가하러 가기 →
              </Link>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
