'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/context/UserContext';
import { Word, QuizSession } from '@/lib/types';

interface ReviewWord extends Word {
  days_since_correct: number;
  last_correct_at: string;
}

interface WrongWord extends Word {
  wrong_count: number;
}

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
  cycleSeenCount: number;
  totalRoundsInCycle: number;
  dailyActivity: { date: string; sessions: number; questions: number }[];
  reviewWords: ReviewWord[];
  topWrongWords: WrongWord[];
}

const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function heatColor(questions: number) {
  if (questions === 0) return 'bg-slate-700/50';
  if (questions <= 3) return 'bg-emerald-900';
  if (questions <= 7) return 'bg-emerald-700';
  if (questions <= 14) return 'bg-emerald-500';
  return 'bg-emerald-400';
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function CalendarHeatmap({ dailyActivity }: { dailyActivity: { date: string; questions: number }[] }) {
  const { weeks, monthLabels, streak, totalActiveDays } = useMemo(() => {
    const activityMap = new Map<string, number>();
    dailyActivity.forEach(d => activityMap.set(d.date, d.questions));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find this week's Monday (Mon=1 in getDay, Sun=0)
    const dow = today.getDay();
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysFromMon);

    // Go back 11 more weeks to get start Monday
    const startMonday = new Date(thisMonday);
    startMonday.setDate(thisMonday.getDate() - 77); // 11 * 7

    // Build 12 weeks × 7 days grid (null = future day)
    const ws: (null | { dateStr: string; questions: number; month: number; day: number })[][] = [];
    for (let w = 0; w < 12; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startMonday);
        date.setDate(startMonday.getDate() + w * 7 + d);
        if (date > today) {
          week.push(null);
        } else {
          const dateStr = formatDate(date);
          week.push({ dateStr, questions: activityMap.get(dateStr) ?? 0, month: date.getMonth(), day: date.getDate() });
        }
      }
      ws.push(week);
    }

    // Month labels: show when month changes between weeks
    const ml = new Map<number, string>();
    for (let wi = 0; wi < 12; wi++) {
      const firstReal = ws[wi].find(c => c !== null);
      if (!firstReal) continue;
      if (wi === 0) { ml.set(wi, MONTH_KO[firstReal.month]); continue; }
      const prevLastReal = [...ws[wi - 1]].reverse().find(c => c !== null);
      if (!prevLastReal || prevLastReal.month !== firstReal.month) {
        ml.set(wi, MONTH_KO[firstReal.month]);
      }
    }

    // Streak: consecutive days ending today (or yesterday if today = no study)
    let streak = 0;
    for (let i = 0; i < 84; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if ((activityMap.get(formatDate(d)) ?? 0) > 0) streak++;
      else if (i > 0) break; // gap breaks streak (i=0 is today — ok to skip)
    }

    return { weeks: ws, monthLabels: ml, streak, totalActiveDays: dailyActivity.length };
  }, [dailyActivity]);

  // Row labels: only Mon, Wed, Fri to save space
  const ROW_LABELS = ['월', '', '수', '', '금', '', ''];

  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">학습 잔디</h2>
        <div className="flex items-center gap-3 text-xs">
          {streak > 0 && <span className="text-emerald-400 font-medium">{streak}일 연속</span>}
          <span className="text-slate-500">{totalActiveDays}일 활동</span>
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        {/* Row (day-of-week) labels */}
        <div className="flex flex-col gap-[5px] pt-4 shrink-0">
          {ROW_LABELS.map((label, i) => (
            <div key={i} style={{ width: 12, height: 14 }} className="text-[9px] text-slate-600 flex items-center">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar columns */}
        <div className="flex flex-col gap-0 min-w-0">
          {/* Month labels row */}
          <div className="flex gap-[5px] mb-1">
            {weeks.map((_, wi) => (
              <div key={wi} style={{ width: 14 }} className="text-[9px] text-slate-500 text-center shrink-0">
                {monthLabels.get(wi) ?? ''}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div className="flex gap-[5px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[5px]">
                {week.map((cell, di) =>
                  cell ? (
                    <div
                      key={di}
                      title={`${cell.dateStr}: ${cell.questions}문제`}
                      className={`rounded-sm shrink-0 ${heatColor(cell.questions)}`}
                      style={{ width: 14, height: 14 }}
                    />
                  ) : (
                    <div key={di} className="rounded-sm shrink-0 bg-slate-900/30" style={{ width: 14, height: 14 }} />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-slate-600">적음</span>
        {(['bg-slate-700/50', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-400'] as const).map((c, i) => (
          <div key={i} className={`rounded-sm ${c}`} style={{ width: 12, height: 12 }} />
        ))}
        <span className="text-[10px] text-slate-600">많음</span>
      </div>
    </div>
  );
}

function urgencyInfo(days: number) {
  if (days >= 14) return { label: '긴급', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  if (days >= 7)  return { label: '권장', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  return { label: '예정', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
}

export default function HistoryPage() {
  const { user } = useUser();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'wrong' | 'category' | 'strong'>('wrong');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch(`/api/stats?user_id=${user.user_id}`)
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-slate-500 text-sm">로그인 후 이용 가능합니다</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-slate-600 text-sm">불러오는 중...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-rose-400 text-sm">오류가 발생했습니다.</p>
    </div>
  );

  const reviewGroups = [
    { words: stats.reviewWords.filter(w => w.days_since_correct >= 14), badge: '2주+', days: 14 },
    { words: stats.reviewWords.filter(w => w.days_since_correct >= 7 && w.days_since_correct < 14), badge: '1주+', days: 7 },
    { words: stats.reviewWords.filter(w => w.days_since_correct >= 3 && w.days_since_correct < 7), badge: '3일+', days: 3 },
  ].filter(g => g.words.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">학습 이력</h1>
        <span className="text-sm text-slate-500">{user.username}</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3.5 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
          <div className="text-xs text-slate-500 mt-0.5">완료 퀴즈</div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3.5 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.overallAccuracy}%</div>
          <div className="text-xs text-slate-500 mt-0.5">정답률</div>
        </div>
        <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3.5 text-center">
          <div className="text-2xl font-bold text-amber-400">R{stats.currentRound}</div>
          <div className="text-xs text-slate-500 mt-0.5">현재 라운드</div>
        </div>
      </div>

      {/* Calendar */}
      <CalendarHeatmap dailyActivity={stats.dailyActivity} />

      {/* SRS Review */}
      {reviewGroups.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">복습 추천</h2>
            <span className="text-xs text-slate-500">마지막으로 맞힌 후 경과 기간</span>
          </div>
          <p className="text-xs text-slate-600 mb-4">잊기 전에 다시 보면 기억이 훨씬 오래 가요</p>

          {reviewGroups.map(group => {
            const urg = urgencyInfo(group.days);
            return (
              <div key={group.badge} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${urg.cls}`}>
                    {group.badge} · {urg.label}
                  </span>
                </div>
                <div className="space-y-0">
                  {group.words.map(word => (
                    <div key={word.id} className="flex items-center justify-between py-2.5 border-b border-slate-700/30 last:border-0">
                      <div>
                        <span className="font-medium text-white text-sm">{word.japanese}</span>
                        {word.reading && <span className="text-xs text-slate-600 ml-1.5">({word.reading})</span>}
                        <span className="text-slate-500 text-xs ml-2">{word.korean}</span>
                      </div>
                      <span className="text-xs text-slate-600 shrink-0 ml-2">{word.days_since_correct}일 전</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700/50 rounded-xl p-1">
        {([
          ['wrong', '틀린 단어'],
          ['category', '카테고리'],
          ['strong', '잘 아는 단어'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: 틀린 단어 */}
      {tab === 'wrong' && (
        <div className="space-y-2">
          {stats.topWrongWords.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">
              아직 틀린 단어가 없어요!<br />
              <span className="text-xs mt-1 inline-block">퀴즈에서 틀린 단어가 생기면 여기에 표시됩니다</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-600 px-1">틀린 적 있는 단어 · 틀린 횟수 순</p>
              {stats.topWrongWords.map((word, idx) => {
                const acc = word.total_attempts > 0 ? Math.round((word.total_correct / word.total_attempts) * 100) : 0;
                return (
                  <div key={word.id} className="bg-slate-800 border border-rose-500/10 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-slate-600 text-xs font-mono mt-0.5 shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-semibold text-white">{word.japanese}</span>
                            {word.reading && <span className="text-xs text-slate-500">({word.reading})</span>}
                          </div>
                          <div className="text-sm text-slate-400 mt-0.5">{word.korean}</div>
                          <div className="text-xs text-rose-400/80 mt-1">
                            {word.total_attempts}번 중 {word.wrong_count}번 틀림
                          </div>
                        </div>
                      </div>
                      <div className={`text-2xl font-bold shrink-0 ${acc < 30 ? 'text-rose-400' : acc < 60 ? 'text-amber-400' : 'text-yellow-400'}`}>
                        {acc}%
                      </div>
                    </div>
                    <div className="mt-3 bg-slate-700/50 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${acc < 30 ? 'bg-rose-400' : acc < 60 ? 'bg-amber-400' : 'bg-yellow-400'}`}
                        style={{ width: `${acc}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Recent sessions */}
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
                    <div key={session.id} className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-0">
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
        </div>
      )}

      {/* Tab: 카테고리 */}
      {tab === 'category' && (
        <div className="space-y-3">
          {stats.categoryStats.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">아직 퀴즈 데이터가 없습니다</div>
          ) : stats.categoryStats.map(cat => (
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
                  className={`h-1.5 rounded-full ${
                    cat.accuracy >= 70 ? 'bg-emerald-400' :
                    cat.accuracy >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${cat.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: 잘 아는 단어 */}
      {tab === 'strong' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 px-1">정답률 높은 단어 · 잘 외운 단어들이에요</p>
          {stats.strongWords.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-sm">아직 데이터가 없습니다. 퀴즈를 먼저 풀어보세요!</div>
          ) : stats.strongWords.map(word => {
            const acc = word.total_attempts > 0 ? Math.round((word.total_correct / word.total_attempts) * 100) : 0;
            return (
              <div key={word.id} className="bg-slate-800 border border-emerald-500/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-white">{word.japanese}</span>
                      {word.reading && <span className="text-xs text-slate-500">({word.reading})</span>}
                    </div>
                    <div className="text-sm text-slate-400 mt-0.5">{word.korean}</div>
                    <div className="text-xs text-slate-600 mt-1">{word.total_correct}/{word.total_attempts}회 · {word.category}</div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-400">{acc}%</div>
                </div>
                <div className="mt-3 bg-slate-700/50 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${acc}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
