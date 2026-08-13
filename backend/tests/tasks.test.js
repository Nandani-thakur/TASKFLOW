// Uses Node's built-in test runner (node --test) so there's no extra
// framework dependency to install.
//
// A fresh temp SQLite file is used for tests (via TASKFLOW_DB_PATH) so
// they never touch the real dev database.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDbPath = path.join(os.tmpdir(), `taskflow-test-${Date.now()}.db`);
process.env.TASKFLOW_DB_PATH = tmpDbPath;

const { default: db } = await import('../src/db.js');
const { default: express } = await import('express');
const { default: tasksRouter } = await import('../src/routes/tasks.js');
const { default: boardsRouter } = await import('../src/routes/boards.js');

const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);
app.use('/api/boards', boardsRouter);

let server;
let baseUrl;
let boardId, todoColumnId, doneColumnId;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  boardId = db.prepare('INSERT INTO boards (name) VALUES (?)').run('Test Board')
    .lastInsertRowid;
  todoColumnId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, 0)')
    .run(boardId, 'To Do').lastInsertRowid;
  doneColumnId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, 1)')
    .run(boardId, 'Done').lastInsertRowid;
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(`${tmpDbPath}-wal`, { force: true });
  fs.rmSync(`${tmpDbPath}-shm`, { force: true });
});

test('creating a task with no title fails', async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId: todoColumnId, title: '   ' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /title/i);
});

test('creating a task with a valid title succeeds', async () => {
  const res = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId: todoColumnId, title: 'Write tests', priority: 'High' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.title, 'Write tests');
  assert.equal(body.column_id, todoColumnId);
});

test('moving a task updates its column correctly', async () => {
  const createRes = await fetch(`${baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId: todoColumnId, title: 'Move me' }),
  });
  const task = await createRes.json();
  assert.equal(task.column_id, todoColumnId);

  const moveRes = await fetch(`${baseUrl}/api/tasks/${task.id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId: doneColumnId }),
  });
  assert.equal(moveRes.status, 200);
  const moved = await moveRes.json();
  assert.equal(moved.column_id, doneColumnId);

  const fromDb = db.prepare('SELECT column_id FROM tasks WHERE id = ?').get(task.id);
  assert.equal(fromDb.column_id, doneColumnId);
});

test('deleting a nonexistent task returns 404', async () => {
  const res = await fetch(`${baseUrl}/api/tasks/999999`, { method: 'DELETE' });
  assert.equal(res.status, 404);
});
