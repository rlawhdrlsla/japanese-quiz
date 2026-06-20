'use client';

import { useEffect, useState } from 'react';
import { Word, QuizSession } from '@/lib/types';

interface StatsData {
  totalWords: number;
  totalSessions: number;
  overallAccuracy: number;
  weakWords: Word[];
  strongWords: Word[];
  recentSessions: QuizSession[];
  categoryStats: { category: string; count: number; accuracy: number }[];
  currentRound: number;
  cooldownWords: number;
}

export default function HistoryPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'weak' | 'strong'>('overview');

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">불러오는 중...</div>;
  if (!stats) return <div className="text-center py-12 text-red-400">오류가 발생했습니다.</div>;

  const accuracyOf = (w: Word) =>
    w.total_attempts > 0 ? Math.round((w.total_correct / w.total_attempts) * 100) : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">📊 통계 & 히스토리</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <div className="text-3xl font-bold text-pink-600">{stats.totalWords}</div>
          <div className="text-sm text-gray-500 mt-1">등록된 단어</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <div className="text-3xl font-bold text-purple-600">{stats.totalSessions}</div>
          <div className="text-sm text-gray-500 mt-1">완료한 퀴즈</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <div className="text-3xl font-bold text-emerald-600">{stats.overallAccuracy}%</div>
          <div className="text-sm text-gray-500 mt-1">전체 정답률</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100">
          <div className="text-3xl font-bold text-amber-500">{stats.currentRound}</div>
          <div className="text-sm text-gray-500 mt-1">현재 라운드</div>
          {stats.cooldownWords > 0 && (
            <div className="text-xs text-amber-400 mt-1">쿨다운 {stats.cooldownWords}개</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['overview', 'weak', 'strong'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'overview' ? '카테고리' : t === 'weak' ? '취약 단어' : '강한 단어'}
          </button>
        ))}
      </div>

      {/* Category Stats */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {stats.categoryStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400">아직 퀴즈 데이터가 없습니다.</div>
          ) : (
            <>
              {stats.categoryStats.map(cat => (
                <div key={cat.category} className="bg-white rounded-xl p-4 shadow-sm border border-pink-50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-gray-800">{cat.category}</span>
                      <span className="text-xs text-gray-400 ml-2">{cat.count}개</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      cat.accuracy >= 70 ? 'text-emerald-600' :
                      cat.accuracy >= 40 ? 'text-orange-500' : 'text-red-500'
                    }`}>{cat.accuracy}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        cat.accuracy >= 70 ? 'bg-emerald-400' :
                        cat.accuracy >= 40 ? 'bg-orange-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${cat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Recent Sessions */}
              {stats.recentSessions.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-pink-100 mt-4">
                  <h2 className="font-bold text-gray-700 mb-3">최근 퀴즈 기록</h2>
                  <div className="space-y-2">
                    {stats.recentSessions.map(session => {
                      const pct = session.total_questions > 0
                        ? Math.round((session.correct_count / session.total_questions) * 100)
                        : 0;
                      const date = new Date(session.created_at);
                      return (
                        <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Round {session.round_number}</span>
                            <span className="text-xs text-gray-400 ml-2">
                              {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{session.correct_count}/{session.total_questions}</span>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                              pct >= 80 ? 'bg-emerald-100 text-emerald-600' :
                              pct >= 60 ? 'bg-yellow-100 text-yellow-600' :
                              'bg-red-100 text-red-600'
                            }`}>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Weak Words */}
      {tab === 'weak' && (
        <div className="space-y-2">
          {stats.weakWords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">아직 데이터가 없습니다. 퀴즈를 먼저 풀어보세요!</div>
          ) : (
            stats.weakWords.map(word => {
              const acc = accuracyOf(word);
              return (
                <div key={word.id} className="bg-white rounded-xl p-4 shadow-sm border border-red-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-gray-800">{word.japanese}</span>
                        {word.reading && <span className="text-xs text-gray-400">({word.reading})</span>}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{word.korean}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {word.total_correct}/{word.total_attempts}회 정답
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${
                        acc < 30 ? 'text-red-500' : acc < 60 ? 'text-orange-500' : 'text-yellow-500'
                      }`}>{acc}%</div>
                      <div className="text-xs text-gray-400 mt-1">{word.category}</div>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${acc < 30 ? 'bg-red-400' : acc < 60 ? 'bg-orange-400' : 'bg-yellow-400'}`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Strong Words */}
      {tab === 'strong' && (
        <div className="space-y-2">
          {stats.strongWords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">아직 데이터가 없습니다. 퀴즈를 먼저 풀어보세요!</div>
          ) : (
            stats.strongWords.map(word => {
              const acc = accuracyOf(word);
              return (
                <div key={word.id} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-gray-800">{word.japanese}</span>
                        {word.reading && <span className="text-xs text-gray-400">({word.reading})</span>}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{word.korean}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {word.total_correct}/{word.total_attempts}회 정답
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-600">{acc}%</div>
                      <div className="text-xs text-gray-400 mt-1">{word.category}</div>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-emerald-400"
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
