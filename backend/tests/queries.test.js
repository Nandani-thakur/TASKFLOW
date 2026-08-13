// Hits the database query layer directly (not through HTTP), per the
// assignment's requirement for a test that exercises the DB layer.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const tmpDbPath = path.join(os.tmpdir(), `taskflow-query-test-${Date.now()}.db`);
process.env.TASKFLOW_DB_PATH = tmpDbPath;

const { default: db } = await import('../src/db.js');
const { tasksPerColumn, tasksByPriority } = await import('../src/queries.js');

let boardId, todoId, doneId;

before(() => {
  boardId = db.prepare('INSERT INTO boards (name) VALUES (?)').run('Query Test Board')
    .lastInsertRowid;
  todoId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, 0)')
    .run(boardId, 'To Do').lastInsertRowid;
  doneId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, 1)')
    .run(boardId, 'Done').lastInsertRowid;

  const insertTask = db.prepare(
    'INSERT INTO tasks (column_id, title, priority) VALUES (?, ?, ?)'
  );
  insertTask.run(todoId, 'Task A', 'High');
  insertTask.run(todoId, 'Task B', 'Low');
  insertTask.run(doneId, 'Task C', 'High');
});

after(() => {
  db.close();
  fs.rmSync(tmpDbPath, { force: true });
  fs.rmSync(`${tmpDbPath}-wal`, { force: true });
  fs.rmSync(`${tmpDbPath}-shm`, { force: true });
});

test('tasksPerColumn returns correct counts per column, including zero-task columns', () => {
  const extraColumnId = db
    .prepare('INSERT INTO columns (board_id, name, position) VALUES (?, ?, 2)')
    .run(boardId, 'Empty Column').lastInsertRowid;

  const rows = tasksPerColumn(db, boardId);
  const byName = Object.fromEntries(rows.map((r) => [r.column_name, r.task_count]));

  assert.equal(byName['To Do'], 2);
  assert.equal(byName['Done'], 1);
  assert.equal(byName['Empty Column'], 0);

  db.prepare('DELETE FROM columns WHERE id = ?').run(extraColumnId);
});

test('tasksByPriority returns only matching tasks, newest first', () => {
  const rows = tasksByPriority(db, boardId, 'High');
  assert.equal(rows.length, 2);
  assert.ok(rows.every((r) => r.priority === 'High'));
  // Task C was inserted after Task A, so it should come first (newest first).
  assert.equal(rows[0].title, 'Task C');
});
