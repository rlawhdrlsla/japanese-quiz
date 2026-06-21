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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-600 text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-rose-400 text-sm">오류가 발생했습니다.</p>
      </div>
    );
  }

  const accuracyOf = (w: Word) =>
    w.total_attempts > 0 ? Math.round((w.total_correct / w.total_attempts) * 100) : 0;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-white">통계</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-white">{stats.totalWords}</div>
          <div className="text-xs text-slate-500 mt-1">등록된 단어</div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-violet-400">{stats.totalSessions}</div>
          <div className="text-xs text-slate-500 mt-1">완료한 퀴즈</div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-emerald-400">{stats.overallAccuracy}%</div>
          <div className="text-xs text-slate-500 mt-1">전체 정답률</div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
          <div className="text-3xl font-bold text-amber-400">R{stats.currentRound}</div>
          <div className="text-xs text-slate-500 mt-1">현재 라운드</div>
          {stats.cooldownWords > 0 && (
            <div className="text-xs text-slate-600 mt-0.5">쿨다운 {stats.cooldownWords}개</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700/50 rounded-xl p-1">
        {(['overview', 'weak', 'strong'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'overview' ? '카테고리' : t === 'weak' ? '취약 단어' : '강한 단어'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {stats.categoryStats.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              아직 퀴즈 데이터가 없습니다
            </div>
          ) : (
            <>
              {stats.categoryStats.map(cat => (
                <div key={cat.category} className="bg-slate-800 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <span className="font-medium text-white text-sm">{cat.category}</span>
                      <span className="text-xs text-slate-600 ml-2">{cat.count}개</span>
                    </div>
                    <span className={`text-sm font-bold ${
                      cat.accuracy >= 70 ? 'text-emerald-400' :
                      cat.accuracy >= 40 ? 'text-amber-400' : 'text-rose-400'
                    }`}>{cat.accuracy}%</span>
                  </div>
                  <div className="bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        cat.accuracy >= 70 ? 'bg-emerald-400' :
                        cat.accuracy >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${cat.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}

              {/* Recent Sessions */}
              {stats.recentSessions.length > 0 && (
                <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 mt-2">
                  <h2 className="text-sm font-semibold text-slate-300 mb-3">최근 퀴즈 기록</h2>
                  <div className="space-y-0">
                    {stats.recentSessions.map(session => {
                      const pct = session.total_questions > 0
                        ? Math.round((session.correct_count / session.total_questions) * 100)
                        : 0;
                      const date = new Date(session.created_at);
                      return (
                        <div
                          key={session.id}
                          className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0"
                        >
                          <div>
                            <span className="text-sm font-medium text-white">Round {session.round_number}</span>
                            <span className="text-xs text-slate-600 ml-2">
                              {date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                              {' '}
                              {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{session.correct_count}/{session.total_questions}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              pct >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                              pct >= 60 ? 'bg-amber-500/10 text-amber-400' :
                              'bg-rose-500/10 text-rose-400'
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

      {/* Weak Words Tab */}
      {tab === 'weak' && (
        <div className="space-y-2">
          {stats.weakWords.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              아직 데이터가 없습니다. 퀴즈를 먼저 풀어보세요!
            </div>
          ) : (
            stats.weakWords.map(word => {
              const acc = accuracyOf(word);
              return (
                <div key={word.id} className="bg-slate-800 border border-rose-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-white">{word.japanese}</span>
                        {word.reading && <span className="text-xs text-slate-500">({word.reading})</span>}
                      </div>
                      <div className="text-sm text-slate-400 mt-0.5">{word.korean}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {word.total_correct}/{word.total_attempts}회 정답 · {word.category}
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${
                      acc < 30 ? 'text-rose-400' :
                      acc < 60 ? 'text-amber-400' :
                      'text-yellow-400'
                    }`}>{acc}%</div>
                  </div>
                  <div className="mt-3 bg-slate-700/50 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        acc < 30 ? 'bg-rose-400' :
                        acc < 60 ? 'bg-amber-400' :
                        'bg-yellow-400'
                      }`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Strong Words Tab */}
      {tab === 'strong' && (
        <div className="space-y-2">
          {stats.strongWords.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              아직 데이터가 없습니다. 퀴즈를 먼저 풀어보세요!
            </div>
          ) : (
            stats.strongWords.map(word => {
              const acc = accuracyOf(word);
              return (
                <div key={word.id} className="bg-slate-800 border border-emerald-500/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-white">{word.japanese}</span>
                        {word.reading && <span className="text-xs text-slate-500">({word.reading})</span>}
                      </div>
                      <div className="text-sm text-slate-400 mt-0.5">{word.korean}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        {word.total_correct}/{word.total_attempts}회 정답 · {word.category}
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{acc}%</div>
                  </div>
                  <div className="mt-3 bg-slate-700/50 rounded-full h-1.5">
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
