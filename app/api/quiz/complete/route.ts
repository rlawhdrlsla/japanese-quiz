import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { UserState } from '@/lib/types';

interface AnswerInput {
  word_id: number;
  is_correct: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { session_id, user_id, answers }: { session_id: number; user_id: number; answers: AnswerInput[] } = body;

    if (!session_id || !user_id || !Array.isArray(answers)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const userState = db.prepare('SELECT current_round FROM user_state WHERE user_id = ?').get(user_id) as UserState | undefined;
    const currentRound = userState?.current_round ?? 0;

    const correctCount = answers.filter(a => a.is_correct).length;

    const transaction = db.transaction(() => {
      for (const answer of answers) {
        db.prepare(`
          INSERT INTO quiz_answers (session_id, word_id, user_answer, is_correct)
          VALUES (?, ?, '', ?)
        `).run(session_id, answer.word_id, answer.is_correct ? 1 : 0);

        if (answer.is_correct) {
          db.prepare(`
            INSERT INTO user_word_stats (user_id, word_id, total_correct, total_attempts)
            VALUES (?, ?, 1, 1)
            ON CONFLICT(user_id, word_id) DO UPDATE SET
              total_correct = total_correct + 1,
              total_attempts = total_attempts + 1,
              skip_until_round = 0
          `).run(user_id, answer.word_id);
        } else {
          db.prepare(`
            INSERT INTO user_word_stats (user_id, word_id, skip_until_round, total_attempts)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(user_id, word_id) DO UPDATE SET
              skip_until_round = ?,
              total_attempts = total_attempts + 1
          `).run(user_id, answer.word_id, currentRound + 2, currentRound + 2);
        }
      }

      db.prepare(
        'UPDATE quiz_sessions SET correct_count = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(correctCount, session_id);
    });

    transaction();

    return NextResponse.json({ success: true, correct_count: correctCount, total: answers.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
