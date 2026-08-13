const PRIORITIES = ['All', 'Low', 'Medium', 'High'];

export default function FilterBar({ priorityFilter, onPriorityChange, searchText, onSearchChange }) {
  return (
    <div className="filter-bar">
      <div className="priority-filters" role="group" aria-label="Filter by priority">
        {PRIORITIES.map((p) => (
          <button
            key={p}
            className={`chip chip-${p.toLowerCase()} ${priorityFilter === p ? 'chip-active' : ''}`}
            onClick={() => onPriorityChange(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <input
        type="search"
        className="search-input"
        placeholder="Search tasks by title…"
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label="Search tasks by title"
      />
    </div>
  );
}
