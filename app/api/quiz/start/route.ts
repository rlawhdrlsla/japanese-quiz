import { NextResponse } from 'next/server';
import { getDb, getCurrentRound, incrementRound } from '@/lib/db';
import { Word } from '@/lib/types';

export async function GET() {
  try {
    const db = getDb();
    const totalWords = (db.prepare('SELECT COUNT(*) as count FROM words').get() as { count: number }).count;

    if (totalWords === 0) {
      return NextResponse.json({ error: '단어가 없습니다. 먼저 단어를 추가해주세요.' }, { status: 400 });
    }

    const newRound = incrementRound();

    // Pick up to 10 words that are not in cooldown
    const eligible = db.prepare(
      'SELECT * FROM words WHERE skip_until_round <= ? ORDER BY RANDOM() LIMIT 10'
    ).all(newRound) as Word[];

    if (eligible.length === 0) {
      // If all words are on cooldown, pick the ones with the lowest skip_until_round
      const fallback = db.prepare(
        'SELECT * FROM words ORDER BY skip_until_round ASC, RANDOM() LIMIT 10'
      ).all() as Word[];

      const sessionResult = db.prepare(
        'INSERT INTO quiz_sessions (round_number, total_questions) VALUES (?, ?)'
      ).run(newRound, fallback.length);

      return NextResponse.json({
        session_id: sessionResult.lastInsertRowid,
        round: newRound,
        words: fallback,
        warning: '모든 단어가 쿨다운 중이어서 대기 시간이 가장 짧은 단어들로 구성했습니다.',
      });
    }

    const sessionResult = db.prepare(
      'INSERT INTO quiz_sessions (round_number, total_questions) VALUES (?, ?)'
    ).run(newRound, eligible.length);

    return NextResponse.json({
      session_id: sessionResult.lastInsertRowid,
      round: newRound,
      words: eligible,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
