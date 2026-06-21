import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { User, UserState } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { username } = await req.json();

    if (!username?.trim()) {
      return NextResponse.json({ error: '닉네임을 입력해주세요.' }, { status: 400 });
    }

    const name = username.trim();

    // Create or find user
    db.prepare('INSERT OR IGNORE INTO users (username) VALUES (?)').run(name);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(name) as User;

    // Create user_state if not exists
    db.prepare('INSERT OR IGNORE INTO user_state (user_id) VALUES (?)').run(user.id);
    const state = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(user.id) as UserState;

    const totalWords = (db.prepare('SELECT COUNT(*) as c FROM words').get() as { c: number }).c;
    const totalRoundsInCycle = totalWords > 0 ? Math.ceil(totalWords / 10) : 0;
    const seenIds: number[] = JSON.parse(state.cycle_seen_ids || '[]');

    return NextResponse.json({
      user_id: user.id,
      username: user.username,
      current_round: state.current_round,
      cycle_seen_count: seenIds.length,
      total_words: totalWords,
      total_rounds_in_cycle: totalRoundsInCycle,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
