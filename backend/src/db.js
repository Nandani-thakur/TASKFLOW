import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DB file lives at backend/data/taskflow.db (created on first run).
// Tests point this at a separate file via TASKFLOW_DB_PATH so they never
// touch the dev database.
const dbPath =
  process.env.TASKFLOW_DB_PATH || path.join(__dirname, '..', 'data', 'taskflow.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

export default db;
