# TaskFlow

A small full-stack task board (React + Node/Express + SQLite). Built for the TaskFlow take-home
assignment.

## Stack

- **Frontend:** React (JS) + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`)
- **Frontend:** https://taskflow-git-main-nandani-thakurs-projects.vercel.app/
- **Backend API:** https://taskflow-backend-cymr.onrender.com

> Note: the backend is on Render's free tier, which sleeps after inactivity — the first request may take ~30-50 seconds to wake it up.

## Project structure

```
taskflow/
  backend/
    src/
      db.js          # DB connection + schema bootstrap
      schema.sql      # table definitions (source of truth for schema)
      seed.js          # seed script
      queries.js       # the two non-trivial SQL queries, used by routes + tests
      routes/
        boards.js
        tasks.js
      server.js        # Express app entrypoint
    tests/
      tasks.test.js     # API-level tests (validation, move, delete)
      queries.test.js   # tests that hit the DB query layer directly
  frontend/
    src/
      api.js            # fetch wrapper with error handling
      App.jsx
      components/
        Board.jsx
        Column.jsx
        TaskCard.jsx
        TaskModal.jsx
        FilterBar.jsx
```

## Running locally (from a fresh clone)

You need Node.js 18+ installed.

### 1. Backend

```bash
cd backend
npm install
npm run seed     # creates backend/data/taskflow.db and fills it with sample data
npm run dev       # starts the API on http://localhost:4000
```

### 2. Frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev       # starts the app on http://localhost:5173
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` requests to the backend on port
4000 (see `frontend/vite.config.js`), so no extra config is needed.

### Running tests

```bash
cd backend
npm test
```

This runs 6 tests using Node's built-in test runner (`node --test`) — no extra test framework
dependency needed. Covers: rejecting an empty title, creating a task, moving a task between columns,
deleting a non-existent task (404), and two tests that call the `tasksPerColumn` / `tasksByPriority`
query functions directly against the database.

## Database

Schema lives in `backend/src/schema.sql` and is applied automatically on startup (`CREATE TABLE IF
NOT EXISTS`, so it's safe to run repeatedly). Three tables:

- `boards (id, name, created_at)`
- `columns (id, board_id → boards.id, name, position)`
- `tasks (id, column_id → columns.id, title NOT NULL, description, priority CHECK IN (Low/Medium/High), created_at)`

Foreign keys are enforced (`PRAGMA foreign_keys = ON`), and `title` is `NOT NULL` at the database
level (not just validated in the API) so an empty title can't get in even via a direct DB call.

### The two non-trivial queries (`backend/src/queries.js`)

1. **`tasksPerColumn(db, boardId)`** — count of tasks per column on a board, using a `LEFT JOIN` +
   `GROUP BY` so columns with zero tasks still appear with `task_count: 0` (an inner join / naive
   filter-after-fetch approach would silently drop empty columns).
2. **`tasksByPriority(db, boardId, priority)`** — tasks with a given priority, newest first, joining
   `tasks → columns` to scope correctly by board (priority alone doesn't tell you which board a task
   belongs to), ordered by `created_at DESC, id DESC`.

Both are exercised directly by `backend/tests/queries.test.js` (not just through the HTTP layer), and
are also used by real API endpoints (`GET /api/boards/:id/stats` and
`GET /api/tasks?boardId=1&priority=High`).

## API overview

| Method | Path | Description |
|---|---|---|
| GET | `/api/boards/:id` | Board with nested columns + tasks |
| GET | `/api/boards/:id/stats` | Task count per column |
| GET | `/api/tasks?boardId=&priority=` | Tasks filtered by priority, newest first |
| POST | `/api/tasks` | Create a task (`columnId`, `title`, `description?`, `priority?`) |
| PUT | `/api/tasks/:id` | Edit a task |
| PATCH | `/api/tasks/:id/move` | Move a task to a different column (`columnId`) |
| DELETE | `/api/tasks/:id` | Delete a task |

Every write endpoint validates on the server (not just the frontend) — an empty/whitespace title, a
bad `priority` value, or a `columnId` that doesn't exist all return `400` with a message, never a
silent failure.

## Decisions & assumptions

- **Single board, no board picker.** The assignment describes one board per team, so the frontend
  hardcodes `boardId = 1` rather than building board-switching UI that wasn't asked for.
- **Task "status" is represented by `column_id`**, not a separate `status` string column. Which
  column a task is in *is* its status, and storing it twice would risk the two getting out of sync.
- **Move is both drag-and-drop and a dropdown.** The brief allowed either; I built the dropdown first
  as the guaranteed-working core control, then added native HTML5 drag-and-drop on top since it was
  cheap once the move endpoint existed. Every task card has both.
- **Search (nice-to-have) is included** — a plain client-side substring match on title, applied
  alongside the priority filter.
- **Priority filter and search are client-side** (filtering already-loaded board data), since the
  whole board is small and already fetched. The two backend "non-trivial query" requirements
  (`tasksPerColumn`, `tasksByPriority`) live as real endpoints instead, since a client-side filter
  wouldn't demonstrate database querying.
- **Optimistic UI on move**, with rollback (re-fetch) if the API call fails, so drag-and-drop feels
  responsive.

## What I'd improve with more time

- Column reordering and adding/renaming columns from the UI (currently fixed at seed time).
- Debounce the search input and move the priority filter server-side once the board data gets larger
  than "fits comfortably in memory."
- Toast-style notifications instead of a single dismissible error banner.
- Deploy it (backend + a static build of the frontend) to a live URL.

## Time spent

Roughly 3–4 hours end to end (schema/backend, frontend, tests, and this write-up).

## Something interesting

`better-sqlite3` is fully synchronous — no promises, no callbacks — which initially felt wrong for
Node, but it turns out that's the point: SQLite itself is a fast, in-process, single-file engine, so
wrapping it in async machinery would add overhead without buying anything, since there's no real I/O
wait to yield during. It made the route handlers noticeably simpler to write (no `await` chains for
what's really just a local read).
