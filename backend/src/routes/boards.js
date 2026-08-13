import { Router } from 'express';
import db from '../db.js';
import { tasksPerColumn } from '../queries.js';

const router = Router();

// GET /api/boards - list all boards (barebones, for a board picker if needed)
router.get('/', (req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY id ASC').all();
  res.json(boards);
});

// GET /api/boards/:id - full board with nested columns + tasks
router.get('/:id', (req, res) => {
  const boardId = Number(req.params.id);
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const columns = db
    .prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC')
    .all(boardId);

  const taskStmt = db.prepare(
    'SELECT * FROM tasks WHERE column_id = ? ORDER BY created_at DESC, id DESC'
  );

  const columnsWithTasks = columns.map((col) => ({
    ...col,
    tasks: taskStmt.all(col.id),
  }));

  res.json({ ...board, columns: columnsWithTasks });
});

// GET /api/boards/:id/stats - task count per column (uses the non-trivial query)
router.get('/:id/stats', (req, res) => {
  const boardId = Number(req.params.id);
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  res.json(tasksPerColumn(db, boardId));
});

export default router;
