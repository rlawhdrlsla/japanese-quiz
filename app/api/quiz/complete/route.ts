import { NextRequest, NextResponse } from 'next/server';
import { getDb, getCurrentRound } from '@/lib/db';

interface AnswerInput {
  word_id: number;
  user_answer: string;
  is_correct: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { session_id, answers }: { session_id: number; answers: AnswerInput[] } = body;

    if (!session_id || !Array.isArray(answers)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }

    const currentRound = getCurrentRound();
    const correctCount = answers.filter(a => a.is_correct).length;

    const insertAnswer = db.prepare(
      'INSERT INTO quiz_answers (session_id, word_id, user_answer, is_correct) VALUES (?, ?, ?, ?)'
    );

    const updateWordCorrect = db.prepare(
      'UPDATE words SET total_correct = total_correct + 1, total_attempts = total_attempts + 1 WHERE id = ?'
    );

    const updateWordWrong = db.prepare(
      'UPDATE words SET total_attempts = total_attempts + 1, skip_until_round = ? WHERE id = ?'
    );

    const transaction = db.transaction(() => {
      for (const answer of answers) {
        insertAnswer.run(session_id, answer.word_id, answer.user_answer, answer.is_correct ? 1 : 0);
        if (answer.is_correct) {
          updateWordCorrect.run(answer.word_id);
        } else {
          // Skip next 1 round: if current is round N, skip N+1, reappear at N+2
          updateWordWrong.run(currentRound + 2, answer.word_id);
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
