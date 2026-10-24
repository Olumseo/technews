import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DB_PATH = process.env.DB_PATH || join(ROOT, 'data', 'technews.db')

mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'creator')),
    title         TEXT NOT NULL DEFAULT '',
    bio           TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    is_sample     INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id           INTEGER PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    section      TEXT NOT NULL,
    title        TEXT NOT NULL,
    dek          TEXT NOT NULL,
    body         TEXT NOT NULL,          -- JSON array of paragraphs
    image_url    TEXT NOT NULL,
    caption      TEXT NOT NULL DEFAULT '',
    quote        TEXT,
    source_name  TEXT,
    source_url   TEXT,
    author_id    INTEGER NOT NULL REFERENCES users(id),
    read_minutes INTEGER NOT NULL,
    views        INTEGER NOT NULL DEFAULT 0,
    is_sample    INTEGER NOT NULL DEFAULT 0,
    published_at TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS articles_published ON articles (published_at DESC);
  CREATE INDEX IF NOT EXISTS articles_section ON articles (section, published_at DESC);
  CREATE INDEX IF NOT EXISTS articles_author ON articles (author_id, published_at DESC);
`)
