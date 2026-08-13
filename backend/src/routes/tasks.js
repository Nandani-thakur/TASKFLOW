import { Router } from 'express';
import db from '../db.js';
import { tasksByPriority } from '../queries.js';

const router = Router();

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

// GET /api/tasks?boardId=1&priority=High -> tasks filtered by priority, newest first
// (uses the non-trivial "tasks by priority" query; boardId is required so the
// query can be scoped correctly)
router.get('/', (req, res) => {
  const { boardId, priority } = req.query;

  if (!boardId) return badRequest(res, 'boardId query param is required');
  if (!priority || !VALID_PRIORITIES.includes(priority)) {
    return badRequest(res, `priority must be one of ${VALID_PRIORITIES.join(', ')}`);
  }

  res.json(tasksByPriority(db, Number(boardId), priority));
});

// POST /api/tasks - create a task
router.post('/', (req, res) => {
  const { columnId, title, description, priority } = req.body || {};

  if (!columnId) return badRequest(res, 'columnId is required');
  if (!title || !String(title).trim()) {
    return badRequest(res, 'title is required and cannot be empty');
  }
  const finalPriority = priority || 'Medium';
  if (!VALID_PRIORITIES.includes(finalPriority)) {
    return badRequest(res, `priority must be one of ${VALID_PRIORITIES.join(', ')}`);
  }

  const column = db.prepare('SELECT id FROM columns WHERE id = ?').get(columnId);
  if (!column) return badRequest(res, 'columnId does not refer to an existing column');

  const info = db
    .prepare(
      'INSERT INTO tasks (column_id, title, description, priority) VALUES (?, ?, ?, ?)'
    )
    .run(columnId, String(title).trim(), description || null, finalPriority);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id - edit title/description/priority
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, description, priority } = req.body || {};

  const newTitle = title !== undefined ? String(title).trim() : existing.title;
  if (!newTitle) return badRequest(res, 'title cannot be empty');

  const newPriority = priority !== undefined ? priority : existing.priority;
  if (!VALID_PRIORITIES.includes(newPriority)) {
    return badRequest(res, `priority must be one of ${VALID_PRIORITIES.join(', ')}`);
  }

  const newDescription = description !== undefined ? description : existing.description;

  db.prepare(
    'UPDATE tasks SET title = ?, description = ?, priority = ? WHERE id = ?'
  ).run(newTitle, newDescription, newPriority, id);

  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

// PATCH /api/tasks/:id/move - move a task to a different column
router.patch('/:id/move', (req, res) => {
  const id = Number(req.params.id);
  const { columnId } = req.body || {};

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });
  if (!columnId) return badRequest(res, 'columnId is required');

  const column = db.prepare('SELECT id FROM columns WHERE id = ?').get(columnId);
  if (!column) return badRequest(res, 'columnId does not refer to an existing column');

  db.prepare('UPDATE tasks SET column_id = ? WHERE id = ?').run(columnId, id);
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

export default router;
