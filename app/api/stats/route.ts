import { NextResponse } from 'next/server';
import { getDb, getCurrentRound } from '@/lib/db';
import { Word, QuizSession } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();

    const totalWords = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;
    const totalSessions = (db.prepare('SELECT COUNT(*) as count FROM quiz_sessions WHERE completed_at IS NOT NULL').get() as { count: number }).count;

    const accuracyRow = db.prepare(
      'SELECT SUM(total_correct) as correct, SUM(total_attempts) as attempts FROM words'
    ).get() as { correct: number; attempts: number };
    const overallAccuracy = accuracyRow.attempts > 0
      ? Math.round((accuracyRow.correct / accuracyRow.attempts) * 100)
      : 0;

    // Words with at least 1 attempt, sorted by accuracy ascending (weak words first)
    const weakWords = db.prepare(
      `SELECT * FROM words
       WHERE total_attempts > 0
       ORDER BY CAST(total_correct AS FLOAT) / total_attempts ASC
       LIMIT 5`
    ).all() as Word[];

    const strongWords = db.prepare(
      `SELECT * FROM words
       WHERE total_attempts > 0
       ORDER BY CAST(total_correct AS FLOAT) / total_attempts DESC
       LIMIT 5`
    ).all() as Word[];

    const recentSessions = db.prepare(
      'SELECT * FROM quiz_sessions WHERE completed_at IS NOT NULL ORDER BY created_at DESC LIMIT 10'
    ).all() as QuizSession[];

    const categoryStats = db.prepare(
      `SELECT category, COUNT(*) as count,
       CASE WHEN SUM(total_attempts) > 0
            THEN ROUND(CAST(SUM(total_correct) AS FLOAT) / SUM(total_attempts) * 100)
            ELSE 0 END as accuracy
       FROM words GROUP BY category ORDER BY category`
    ).all() as { category: string; count: number; accuracy: number }[];

    const currentRound = getCurrentRound();
    const cooldownWords = (db.prepare(
      'SELECT COUNT(*) as count FROM words WHERE skip_until_round > ?'
    ).get(currentRound) as { count: number }).count;

    return NextResponse.json({
      totalWords,
      totalSessions,
      overallAccuracy,
      weakWords,
      strongWords,
      recentSessions,
      categoryStats,
      currentRound,
      cooldownWords,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
