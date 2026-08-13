export default function TaskCard({ task, allColumns, onEdit, onDelete, onMove }) {
  function handleDragStart(e) {
    e.dataTransfer.setData('text/task-id', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      className={`task-card priority-${task.priority.toLowerCase()}`}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="task-card-top">
        <span className={`priority-badge priority-badge-${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
        <div className="task-card-actions">
          <button className="icon-btn" onClick={onEdit} aria-label="Edit task" title="Edit">
            ✎
          </button>
          <button className="icon-btn" onClick={onDelete} aria-label="Delete task" title="Delete">
            ✕
          </button>
        </div>
      </div>

      <h3 className="task-title">{task.title}</h3>
      {task.description && <p className="task-description">{task.description}</p>}

      <div className="task-card-footer">
        <select
          className="move-select"
          value={task.column_id}
          onChange={(e) => onMove(Number(e.target.value))}
          aria-label="Move task to column"
        >
          {allColumns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
