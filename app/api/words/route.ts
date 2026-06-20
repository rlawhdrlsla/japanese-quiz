import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { Word } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let query = 'SELECT * FROM words';
    const params: string[] = [];
    const conditions: string[] = [];

    if (category && category !== '전체') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(japanese LIKE ? OR korean LIKE ? OR reading LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const words = db.prepare(query).all(...params) as Word[];
    const categories = db.prepare('SELECT DISTINCT category FROM words ORDER BY category').all() as { category: string }[];

    return NextResponse.json({ words, categories: categories.map(c => c.category) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { japanese, korean, reading = '', category = '기본' } = body;

    if (!japanese?.trim() || !korean?.trim()) {
      return NextResponse.json({ error: '일본어와 한국어를 모두 입력해주세요.' }, { status: 400 });
    }

    const result = db.prepare(
      'INSERT INTO words (japanese, korean, reading, category) VALUES (?, ?, ?, ?)'
    ).run(japanese.trim(), korean.trim(), reading.trim(), category.trim() || '기본');

    const word = db.prepare('SELECT * FROM words WHERE id = ?').get(result.lastInsertRowid) as Word;
    return NextResponse.json({ word }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
