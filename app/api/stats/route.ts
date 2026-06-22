import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Word, QuizSession, UserState } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const user_id = parseInt(req.nextUrl.searchParams.get('user_id') ?? '0');

    if (!user_id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    db.prepare('INSERT OR IGNORE INTO user_state (user_id) VALUES (?)').run(user_id);
    const userState = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(user_id) as UserState;
    const seenIds: number[] = JSON.parse(userState.cycle_seen_ids || '[]');

    const totalWords = (db.prepare('SELECT COUNT(*) as c FROM words').get() as { c: number }).c;
    const totalSessions = (db.prepare(
      'SELECT COUNT(*) as c FROM quiz_sessions WHERE completed_at IS NOT NULL AND user_id = ?'
    ).get(user_id) as { c: number }).c;

    const accRow = db.prepare(
      'SELECT SUM(total_correct) as correct, SUM(total_attempts) as attempts FROM user_word_stats WHERE user_id = ?'
    ).get(user_id) as { correct: number; attempts: number };
    const overallAccuracy = accRow?.attempts > 0
      ? Math.round((accRow.correct / accRow.attempts) * 100)
      : 0;

    // Weak words TOP 10
    const weakWords = db.prepare(`
      SELECT w.*, uws.total_correct, uws.total_attempts
      FROM words w
      JOIN user_word_stats uws ON uws.word_id = w.id AND uws.user_id = ?
      WHERE uws.total_attempts > 0
      ORDER BY CAST(uws.total_correct AS FLOAT) / uws.total_attempts ASC, uws.total_attempts DESC
      LIMIT 10
    `).all(user_id) as Word[];

    const strongWords = db.prepare(`
      SELECT w.*, uws.total_correct, uws.total_attempts
      FROM words w
      JOIN user_word_stats uws ON uws.word_id = w.id AND uws.user_id = ?
      WHERE uws.total_attempts > 0
      ORDER BY CAST(uws.total_correct AS FLOAT) / uws.total_attempts DESC
      LIMIT 5
    `).all(user_id) as Word[];

    const recentSessions = db.prepare(
      'SELECT * FROM quiz_sessions WHERE completed_at IS NOT NULL AND user_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all(user_id) as QuizSession[];

    const categoryStats = db.prepare(`
      SELECT w.category, COUNT(DISTINCT w.id) as count,
        CASE WHEN SUM(uws.total_attempts) > 0
          THEN ROUND(CAST(SUM(uws.total_correct) AS FLOAT) / SUM(uws.total_attempts) * 100)
          ELSE 0 END as accuracy
      FROM words w
      LEFT JOIN user_word_stats uws ON uws.word_id = w.id AND uws.user_id = ?
      GROUP BY w.category ORDER BY w.category
    `).all(user_id) as { category: string; count: number; accuracy: number }[];

    const cooldownWords = (db.prepare(
      'SELECT COUNT(*) as c FROM user_word_stats WHERE user_id = ? AND skip_until_round > ?'
    ).get(user_id, userState.current_round) as { c: number }).c;

    const totalRoundsInCycle = totalWords > 0 ? Math.ceil(totalWords / 10) : 0;

    // Daily activity for heatmap (last 84 days)
    const dailyActivity = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as sessions,
        SUM(total_questions) as questions
      FROM quiz_sessions
      WHERE user_id = ?
        AND completed_at IS NOT NULL
        AND created_at >= date('now', '-84 days')
      GROUP BY date(created_at)
    `).all(user_id) as { date: string; sessions: number; questions: number }[];

    // SRS review recommendations (words last correct >= 3 days ago)
    const reviewWords = db.prepare(`
      SELECT w.*, uws.total_correct, uws.total_attempts, uws.last_correct_at,
        CAST((julianday('now') - julianday(uws.last_correct_at)) AS INTEGER) as days_since_correct
      FROM user_word_stats uws
      JOIN words w ON w.id = uws.word_id
      WHERE uws.user_id = ?
        AND uws.last_correct_at IS NOT NULL
        AND uws.total_correct > 0
        AND (julianday('now') - julianday(uws.last_correct_at)) >= 3
      ORDER BY uws.last_correct_at ASC
      LIMIT 30
    `).all(user_id) as (Word & { days_since_correct: number; last_correct_at: string })[];

    // Top 10 most-missed words (at least 1 wrong attempt)
    const topWrongWords = db.prepare(`
      SELECT w.*, uws.total_correct, uws.total_attempts,
        (uws.total_attempts - uws.total_correct) as wrong_count
      FROM user_word_stats uws
      JOIN words w ON w.id = uws.word_id
      WHERE uws.user_id = ? AND uws.total_correct < uws.total_attempts
      ORDER BY wrong_count DESC, CAST(uws.total_correct AS FLOAT) / uws.total_attempts ASC
      LIMIT 10
    `).all(user_id) as (Word & { wrong_count: number })[];

    return NextResponse.json({
      totalWords,
      totalSessions,
      overallAccuracy,
      weakWords,
      strongWords,
      recentSessions,
      categoryStats,
      currentRound: userState.current_round,
      cooldownWords,
      cycleSeenCount: seenIds.length,
      totalRoundsInCycle,
      dailyActivity,
      reviewWords,
      topWrongWords,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
