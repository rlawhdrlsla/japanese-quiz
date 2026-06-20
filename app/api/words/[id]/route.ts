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
    db.prepare('DELETE FROM quiz_answers WHERE word_id = ?').run(id);
    db.prepare('DELETE FROM words WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
