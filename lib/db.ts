import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'japanese-quiz.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      japanese TEXT NOT NULL,
      korean TEXT NOT NULL,
      reading TEXT DEFAULT '',
      category TEXT DEFAULT '기본',
      skip_until_round INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_number INTEGER NOT NULL,
      total_questions INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER REFERENCES quiz_sessions(id),
      word_id INTEGER REFERENCES words(id),
      user_answer TEXT DEFAULT '',
      is_correct INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_state (key, value) VALUES ('current_round', '0');
  `);
}

export function getCurrentRound(): number {
  const db = getDb();
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get('current_round') as { value: string } | undefined;
  return parseInt(row?.value ?? '0', 10);
}

export function incrementRound(): number {
  const db = getDb();
  const current = getCurrentRound();
  const next = current + 1;
  db.prepare('UPDATE app_state SET value = ? WHERE key = ?').run(String(next), 'current_round');
  return next;
}
