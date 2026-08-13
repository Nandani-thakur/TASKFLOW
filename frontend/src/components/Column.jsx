import { useState } from 'react';
import TaskCard from './TaskCard.jsx';

export default function Column({ column, allColumns, onAddTask, onEditTask, onDeleteTask, onMoveTask }) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = Number(e.dataTransfer.getData('text/task-id'));
    if (taskId) onMoveTask(taskId, column.id);
  }

  return (
    <div
      className={`column ${isDragOver ? 'column-drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h2>{column.name}</h2>
        <span className="task-count" title="Tasks in this column">
          {column.tasks.length}
        </span>
      </div>

      <div className="task-list">
        {column.tasks.length === 0 && <p className="empty-hint">No tasks here.</p>}
        {column.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            allColumns={allColumns}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.id)}
            onMove={(columnId) => onMoveTask(task.id, columnId)}
          />
        ))}
      </div>

      <button className="add-task-btn" onClick={() => onAddTask(column.id)}>
        + Add task
      </button>
    </div>
  );
}
