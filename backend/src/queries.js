// Non-trivial queries (not plain "SELECT * FROM table").
// Pulled into their own module so both the routes and the tests can call
// them directly against the database layer.

/**
 * Count of tasks per column, for a given board.
 * Uses LEFT JOIN + GROUP BY so columns with zero tasks still show up with count 0.
 */
export function tasksPerColumn(db, boardId) {
  return db
    .prepare(
      `SELECT c.id          AS column_id,
              c.name        AS column_name,
              c.position    AS position,
              COUNT(t.id)   AS task_count
         FROM columns c
         LEFT JOIN tasks t ON t.column_id = c.id
        WHERE c.board_id = ?
        GROUP BY c.id
        ORDER BY c.position ASC`
    )
    .all(boardId);
}

/**
 * Tasks with a given priority on a given board, newest first.
 * Joins tasks -> columns to scope by board_id, since priority alone
 * doesn't identify which board a task belongs to.
 */
export function tasksByPriority(db, boardId, priority) {
  return db
    .prepare(
      `SELECT t.id, t.title, t.description, t.priority, t.created_at, t.column_id, c.name AS column_name
         FROM tasks t
         JOIN columns c ON c.id = t.column_id
        WHERE c.board_id = ? AND t.priority = ?
        ORDER BY t.created_at DESC, t.id DESC`
    )
    .all(boardId, priority);
}
