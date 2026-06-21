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

    // Per-user accuracy
    const accRow = db.prepare(
      'SELECT SUM(total_correct) as correct, SUM(total_attempts) as attempts FROM user_word_stats WHERE user_id = ?'
    ).get(user_id) as { correct: number; attempts: number };
    const overallAccuracy = accRow?.attempts > 0
      ? Math.round((accRow.correct / accRow.attempts) * 100)
      : 0;

    // Weak words: lowest accuracy, min 1 attempt
    const weakWords = db.prepare(`
      SELECT w.*, uws.total_correct, uws.total_attempts
      FROM words w
      JOIN user_word_stats uws ON uws.word_id = w.id AND uws.user_id = ?
      WHERE uws.total_attempts > 0
      ORDER BY CAST(uws.total_correct AS FLOAT) / uws.total_attempts ASC
      LIMIT 5
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

    // Category stats from per-user data
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
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
