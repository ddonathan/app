import { useQuery } from "convex/react";
import { LayoutGrid, List, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import KanbanBoard from "./components/KanbanBoard";
import ListView from "./components/ListView";
import QuickCapture from "./components/QuickCapture";
import StatsBar from "./components/StatsBar";
import TaskDetail from "./components/TaskDetail";

type View = "kanban" | "list";

export default function App() {
  const [view, setView] = useState<View>("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const searchResults = useQuery(
    api.tasks.search,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip",
  );

  const handleSelectTask = useCallback((id: Id<"tasks">) => {
    setSelectedTaskId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleSearchSelect = (task: Doc<"tasks">) => {
    setSelectedTaskId(task._id);
    setSearchQuery("");
    setShowSearch(false);
  };

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <h1>Tasks</h1>

        <div className="search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(e.target.value.length >= 2);
            }}
            onFocus={() => {
              if (searchQuery.length >= 2) setShowSearch(true);
            }}
            onBlur={() => {
              // Delay to allow click on results
              setTimeout(() => setShowSearch(false), 200);
            }}
          />
          {showSearch && searchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((task) => (
                <div
                  key={task._id}
                  className="search-result-item"
                  onMouseDown={() => handleSearchSelect(task)}
                >
                  <div className="result-title">{task.title}</div>
                  <div className="result-meta">
                    {task.status} {task.owner ? `| ${task.owner}` : ""}
                    {task.clientName ? ` | ${task.clientName}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSearch && searchResults && searchResults.length === 0 && (
            <div className="search-results">
              <div className="search-result-item">
                <div className="result-meta">No results found</div>
              </div>
            </div>
          )}
        </div>

        <div className="view-tabs">
          <button className={view === "kanban" ? "active" : ""} onClick={() => setView("kanban")}>
            <LayoutGrid size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
            Kanban
          </button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
            <List size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
            List
          </button>
        </div>
      </header>

      {/* Stats */}
      <StatsBar />

      {/* Main content */}
      <div className="app-main">
        {view === "kanban" ? (
          <KanbanBoard onSelectTask={handleSelectTask} />
        ) : (
          <ListView onSelectTask={handleSelectTask} />
        )}
      </div>

      {/* Task detail panel */}
      {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={handleCloseDetail} />}

      {/* Quick capture FAB */}
      <QuickCapture />
    </>
  );
}
