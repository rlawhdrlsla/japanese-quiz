import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Word } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const body = await req.json();
    const { japanese, korean, reading = '', category = '기본' } = body;

    if (!japanese?.trim() || !korean?.trim()) {
      return NextResponse.json({ error: '일본어와 한국어를 모두 입력해주세요.' }, { status: 400 });
    }

    db.prepare(
      'UPDATE words SET japanese = ?, korean = ?, reading = ?, category = ? WHERE id = ?'
    ).run(japanese.trim(), korean.trim(), reading.trim(), category.trim() || '기본', id);

    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(id) as Word;
    return NextResponse.json({ word });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = getDb();
    const { id } = await params;
    const wordId = parseInt(id);

    db.transaction(() => {
      db.prepare('DELETE FROM quiz_answers WHERE word_id = ?').run(id);
      db.prepare('DELETE FROM user_word_stats WHERE word_id = ?').run(id);

      // Remove word ID from all users' cycle_seen_ids JSON arrays
      const states = db.prepare('SELECT user_id, cycle_seen_ids FROM user_state').all() as { user_id: number; cycle_seen_ids: string }[];
      for (const state of states) {
        const ids: number[] = JSON.parse(state.cycle_seen_ids || '[]');
        const filtered = ids.filter(i => i !== wordId);
        if (filtered.length !== ids.length) {
          db.prepare('UPDATE user_state SET cycle_seen_ids = ? WHERE user_id = ?')
            .run(JSON.stringify(filtered), state.user_id);
        }
      }

      db.prepare('DELETE FROM words WHERE id = ?').run(id);
    })();

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
