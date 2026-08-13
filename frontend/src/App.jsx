import { useEffect, useMemo, useState, useCallback } from 'react';
import { api } from './api.js';
import Board from './components/Board.jsx';
import FilterBar from './components/FilterBar.jsx';
import TaskModal from './components/TaskModal.jsx';

const BOARD_ID = 1; // single board for this assignment - no board picker needed

export default function App() {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchText, setSearchText] = useState('');

  const [modalState, setModalState] = useState(null); // { mode: 'create'|'edit', columnId?, task? }

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBoard(BOARD_ID);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Auto-clear transient action errors (e.g. failed create/move) after a bit,
  // so they don't sit on screen forever.
  useEffect(() => {
    if (!actionError) return;
    const t = setTimeout(() => setActionError(null), 5000);
    return () => clearTimeout(t);
  }, [actionError]);

  const filteredColumns = useMemo(() => {
    if (!board) return [];
    const search = searchText.trim().toLowerCase();
    return board.columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => {
        const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
        const matchesSearch = !search || t.title.toLowerCase().includes(search);
        return matchesPriority && matchesSearch;
      }),
    }));
  }, [board, priorityFilter, searchText]);

  async function handleCreateTask(columnId, values) {
    try {
      await api.createTask({ columnId, ...values });
      setModalState(null);
      await loadBoard();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleUpdateTask(taskId, values) {
    try {
      await api.updateTask(taskId, values);
      setModalState(null);
      await loadBoard();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.deleteTask(taskId);
      await loadBoard();
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleMoveTask(taskId, columnId) {
    // Optimistic update so drag-and-drop / dropdown moves feel instant.
    setBoard((prev) => {
      if (!prev) return prev;
      let moved = null;
      const columns = prev.columns.map((col) => {
        const stay = col.tasks.filter((t) => {
          if (t.id === taskId) {
            moved = t;
            return false;
          }
          return true;
        });
        return { ...col, tasks: stay };
      });
      if (moved) {
        moved = { ...moved, column_id: columnId };
        return {
          ...prev,
          columns: columns.map((col) =>
            col.id === columnId ? { ...col, tasks: [moved, ...col.tasks] } : col
          ),
        };
      }
      return prev;
    });

    try {
      await api.moveTask(taskId, columnId);
    } catch (err) {
      setActionError(err.message);
      await loadBoard(); // reconcile with server state on failure
    }
  }

  if (loading) {
    return (
      <div className="app-status">
        <p>Loading board…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-status">
        <p className="error-text">Couldn't load the board: {error}</p>
        <button onClick={loadBoard}>Retry</button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{board.name}</h1>
        <p className="app-subtitle">TaskFlow board</p>
      </header>

      {actionError && (
        <div className="banner banner-error" role="alert">
          {actionError}
          <button className="banner-dismiss" onClick={() => setActionError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <FilterBar
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        searchText={searchText}
        onSearchChange={setSearchText}
      />

      <Board
        columns={filteredColumns}
        allColumns={board.columns}
        onAddTask={(columnId) => setModalState({ mode: 'create', columnId })}
        onEditTask={(task) => setModalState({ mode: 'edit', task })}
        onDeleteTask={handleDeleteTask}
        onMoveTask={handleMoveTask}
      />

      {modalState && (
        <TaskModal
          mode={modalState.mode}
          task={modalState.task}
          onClose={() => setModalState(null)}
          onSubmit={(values) =>
            modalState.mode === 'create'
              ? handleCreateTask(modalState.columnId, values)
              : handleUpdateTask(modalState.task.id, values)
          }
        />
      )}
    </div>
  );
}
