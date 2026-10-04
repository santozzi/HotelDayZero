import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import path from 'node:path';

// Base de datos SQLite (módulo nativo de Node 22, sin dependencias). Vive en el volumen /data.
export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'hotel.db'));
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      max_score INTEGER NOT NULL,
      seconds INTEGER NOT NULL,
      flags INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS leaderboard_rank ON leaderboard (score DESC, seconds ASC);
    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      rooms INTEGER NOT NULL,
      data TEXT NOT NULL,
      updated TEXT NOT NULL
    );
  `);

  // Migración única del ranking viejo en JSON.
  const legacy = path.join(dataDir, 'leaderboard.json');
  if (existsSync(legacy)) {
    try {
      const rows = JSON.parse(readFileSync(legacy, 'utf8'));
      const ins = db.prepare('INSERT INTO leaderboard (name, score, max_score, seconds, flags, date) VALUES (?, ?, ?, ?, ?, ?)');
      for (const r of rows) ins.run(r.name, r.score, r.maxScore ?? 1700, r.seconds, r.flags ?? 0, r.date ?? new Date().toISOString());
      renameSync(legacy, legacy + '.migrado');
    } catch {
      /* si el JSON está roto, se ignora */
    }
  }

  const q = {
    insertScore: db.prepare('INSERT INTO leaderboard (name, score, max_score, seconds, flags, date) VALUES (?, ?, ?, ?, ?, ?)'),
    top: db.prepare('SELECT name, score, max_score AS maxScore, seconds, flags FROM leaderboard ORDER BY score DESC, seconds ASC LIMIT ?'),
    rank: db.prepare('SELECT COUNT(*) AS n FROM leaderboard WHERE score > ? OR (score = ? AND seconds < ?)'),
    upsertSave: db.prepare(`INSERT INTO saves (id, name, score, rooms, data, updated) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, score = excluded.score, rooms = excluded.rooms,
      data = excluded.data, updated = excluded.updated`),
    getSave: db.prepare('SELECT id, name, score, rooms, data, updated FROM saves WHERE id = ?'),
    deleteSave: db.prepare('DELETE FROM saves WHERE id = ?'),
  };

  return {
    addScore(e) {
      q.insertScore.run(e.name, e.score, e.maxScore, e.seconds, e.flags, e.date);
      return q.rank.get(e.score, e.score, e.seconds).n + 1;
    },
    top: (limit = 10) => q.top.all(limit),
    saveGame: (id, name, score, rooms, data) => q.upsertSave.run(id, name, score, rooms, JSON.stringify(data), new Date().toISOString()),
    loadGame(id) {
      const row = q.getSave.get(id);
      return row ? { ...row, data: JSON.parse(row.data) } : null;
    },
    deleteGame: (id) => q.deleteSave.run(id),
  };
}
