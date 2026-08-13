import Column from './Column.jsx';

export default function Board({ columns, allColumns, onAddTask, onEditTask, onDeleteTask, onMoveTask }) {
  return (
    <div className="board">
      {columns.map((col) => (
        <Column
          key={col.id}
          column={col}
          allColumns={allColumns}
          onAddTask={onAddTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onMoveTask={onMoveTask}
        />
      ))}
    </div>
  );
}
