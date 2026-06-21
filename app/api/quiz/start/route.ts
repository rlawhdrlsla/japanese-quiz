import { NextRequest, NextResponse } from 'next/server';
import { getDb, shuffle } from '@/lib/db';
import { Word, UserState, UserWordStat } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const user_id = parseInt(req.nextUrl.searchParams.get('user_id') ?? '0');

    if (!user_id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const totalWords = (db.prepare('SELECT COUNT(*) as c FROM words').get() as { c: number }).c;
    if (totalWords === 0) {
      return NextResponse.json({ error: '단어가 없습니다. 먼저 단어를 추가해주세요.' }, { status: 400 });
    }

    // Get or create user_state
    db.prepare('INSERT OR IGNORE INTO user_state (user_id) VALUES (?)').run(user_id);
    const userState = db.prepare('SELECT * FROM user_state WHERE user_id = ?').get(user_id) as UserState;

    const newRound = userState.current_round + 1;
    let seenIds: number[] = JSON.parse(userState.cycle_seen_ids || '[]');

    // Load all words and per-user stats
    const allWords = db.prepare('SELECT * FROM words').all() as Word[];
    const statsRows = db.prepare('SELECT * FROM user_word_stats WHERE user_id = ?').all(user_id) as UserWordStat[];
    const statsMap = new Map(statsRows.map(s => [s.word_id, s]));

    const isEligible = (wordId: number) => {
      const stat = statsMap.get(wordId);
      return !stat || stat.skip_until_round <= newRound;
    };

    let words: Word[] = [];
    let cycleReset = false;
    let warning = '';

    // Priority 1: words not yet in this cycle and not in cooldown
    const freshEligible = shuffle(allWords.filter(w => !seenIds.includes(w.id) && isEligible(w.id)));
    words = freshEligible.slice(0, 10);

    // Priority 2: retry words (seen this cycle, cooldown just expired)
    if (words.length < 10) {
      const retryEligible = shuffle(allWords.filter(w => {
        if (!seenIds.includes(w.id)) return false;
        const stat = statsMap.get(w.id);
        return stat && stat.skip_until_round > 0 && stat.skip_until_round <= newRound;
      }));
      words = [...words, ...retryEligible.slice(0, 10 - words.length)];
    }

    // Priority 3: cycle complete — reset and start fresh
    if (words.length === 0) {
      seenIds = [];
      cycleReset = true;
      const freshAfterReset = shuffle(allWords.filter(w => isEligible(w.id)));
      words = freshAfterReset.slice(0, 10);
    }

    // Fallback: all in cooldown (edge case)
    if (words.length === 0) {
      const sorted = [...allWords].sort((a, b) => {
        const as = statsMap.get(a.id)?.skip_until_round ?? 0;
        const bs = statsMap.get(b.id)?.skip_until_round ?? 0;
        return as - bs;
      });
      words = sorted.slice(0, 10);
      warning = '모든 단어가 쿨다운 중이어서 가장 빨리 풀리는 단어들로 구성했습니다.';
    }

    // Add newly selected words to seenIds
    for (const w of words) {
      if (!seenIds.includes(w.id)) seenIds.push(w.id);
    }

    // Update user_state
    db.prepare(
      'UPDATE user_state SET current_round = ?, cycle_seen_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).run(newRound, JSON.stringify(seenIds), user_id);

    // Create session
    const sessionResult = db.prepare(
      'INSERT INTO quiz_sessions (round_number, total_questions, user_id) VALUES (?, ?, ?)'
    ).run(newRound, words.length, user_id);

    return NextResponse.json({
      session_id: sessionResult.lastInsertRowid,
      round: newRound,
      words,
      total_words: totalWords,
      cycle_seen_count: seenIds.length,
      cycle_reset: cycleReset,
      warning,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
