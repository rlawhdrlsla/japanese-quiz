import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    db.prepare(
      'UPDATE user_state SET current_round = 0, cycle_seen_ids = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
    ).run('[]', user_id);

    db.prepare(
      'UPDATE user_word_stats SET skip_until_round = 0 WHERE user_id = ?'
    ).run(user_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
