// Seeds a fresh database with one board, three columns, and a handful of
// tasks so the app isn't empty on first run.
// Usage: npm run seed

import db from './db.js';

const wipe = db.transaction(() => {
  db.exec('DELETE FROM tasks; DELETE FROM columns; DELETE FROM boards;');
  db.exec(
    "DELETE FROM sqlite_sequence WHERE name IN ('tasks', 'columns', 'boards');"
  );
});

const seed = db.transaction(() => {
  const boardId = db
    .prepare('INSERT INTO boards (name) VALUES (?)')
    .run('Team Sprint Board').lastInsertRowid;

  const insertColumn = db.prepare(
    'INSERT INTO columns (board_id, name, position) VALUES (?, ?, ?)'
  );
  const todoId = insertColumn.run(boardId, 'To Do', 0).lastInsertRowid;
  const inProgressId = insertColumn.run(boardId, 'In Progress', 1).lastInsertRowid;
  const doneId = insertColumn.run(boardId, 'Done', 2).lastInsertRowid;

  const insertTask = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority)
     VALUES (?, ?, ?, ?)`
  );

  insertTask.run(todoId, 'Set up CI pipeline', 'Add GitHub Actions for lint + test', 'Medium');
  insertTask.run(todoId, 'Design onboarding flow', null, 'Low');
  insertTask.run(todoId, 'Fix login bug on Safari', 'Session cookie not persisting', 'High');
  insertTask.run(inProgressId, 'Build task board UI', 'React components for board/column/task', 'High');
  insertTask.run(inProgressId, 'Write API docs', null, 'Medium');
  insertTask.run(doneId, 'Project kickoff meeting', 'Aligned on scope with the team', 'Low');
  insertTask.run(doneId, 'Repo + tooling setup', 'ESLint, Prettier, base folder structure', 'Medium');
});

wipe();
seed();

console.log('Seed complete: 1 board, 3 columns, 7 tasks.');
