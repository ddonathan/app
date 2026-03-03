import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Eye, EyeOff, LayoutGrid, List, LogOut, Search } from "lucide-react";
import { useCallback, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import BloodLabsDashboard from "./components/BloodLabsDashboard";
import BodyCompDashboard from "./components/BodyCompDashboard";
import BrainDump from "./components/BrainDump";
import FitnessDashboard from "./components/FitnessDashboard";
import KanbanBoard from "./components/KanbanBoard";
import ListView from "./components/ListView";
import Login from "./components/Login";
import NavMenu from "./components/NavMenu";
import ProjectDetail from "./components/ProjectDetail";
import ProjectsView from "./components/ProjectsView";
import QuickCapture from "./components/QuickCapture";
import StatsBar from "./components/StatsBar";
import TagsManager from "./components/TagsManager";
import TaskDetail from "./components/TaskDetail";

type View = "kanban" | "list";
type Page = "tasks" | "projects" | "tags" | "fitness" | "bodycomp" | "bloodlabs";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <AuthenticatedApp signOut={signOut} />;
}

function AuthenticatedApp({ signOut }: { signOut: () => Promise<void> }) {
  const [page, setPage] = useState<Page>("tasks");
  const [view, setView] = useState<View>("kanban");
  const [selectedTaskId, setSelectedTaskId] = useState<Id<"tasks"> | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(null);
  const [filterText, setFilterText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTemplate, setNewTaskTemplate] = useState<
    | {
        tags?: string[];
        projectId?: string;
        status?: "inbox" | "active" | "backlog" | "done" | "someday";
      }
    | undefined
  >(undefined);

  const handleSelectTask = useCallback((id: Id<"tasks">) => {
    if (id === ("__new__" as Id<"tasks">)) {
      setShowNewTaskForm(true);
      setNewTaskTemplate(undefined);
      return;
    }
    setSelectedTaskId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    setFilterText((prev) => {
      const terms = prev.split(/\s+/).filter(Boolean);
      if (terms.includes(tag)) {
        return terms.filter((t) => t !== tag).join(" ");
      }
      return prev ? `${prev} ${tag}` : tag;
    });
  }, []);

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <NavMenu activePage={page} onNavigate={setPage} />

        <h1>
          {page === "tasks" && "Tasks"}
          {page === "projects" && "Projects"}
          {page === "tags" && "Tags"}
          {page === "fitness" && "Big Four No Dread"}
          {page === "bodycomp" && "Body Composition"}
          {page === "bloodlabs" && "Blood Labs"}
        </h1>

        {page === "tasks" && (
          <>
            <div className="search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                placeholder="Filter tasks... (use tags like @context #project)"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>

            <button
              type="button"
              className={`show-all-toggle${showAll ? " active" : ""}`}
              onClick={() => setShowAll(!showAll)}
              title={showAll ? "Showing all tasks" : "Hiding done & future tasks"}
            >
              {showAll ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            <div className="view-tabs">
              <button
                type="button"
                className={view === "kanban" ? "active" : ""}
                onClick={() => setView("kanban")}
              >
                <LayoutGrid size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                Kanban
              </button>
              <button
                type="button"
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                <List size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
                List
              </button>
              <BrainDump />
            </div>
          </>
        )}

        <button
          type="button"
          className="sign-out-btn"
          onClick={() => void signOut()}
          title="Sign out"
          style={page !== "tasks" ? { marginLeft: "auto" } : undefined}
        >
          <LogOut size={14} />
        </button>
      </header>

      {page === "tasks" ? (
        <>
          {/* Stats */}
          <StatsBar />

          {/* Main content */}
          <div className="app-main">
            {view === "kanban" ? (
              <KanbanBoard
                onSelectTask={handleSelectTask}
                showAll={showAll}
                filterText={filterText}
                onTagClick={handleTagClick}
                onCloseAndNew={(t) => {
                  setNewTaskTemplate(t);
                  setShowNewTaskForm(true);
                }}
              />
            ) : (
              <ListView
                onSelectTask={handleSelectTask}
                showAll={showAll}
                filterText={filterText}
                onTagClick={handleTagClick}
              />
            )}
          </div>

          {/* Task detail panel */}
          {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={handleCloseDetail} />}

          {/* Quick capture FAB */}
          <QuickCapture
            template={newTaskTemplate}
            forceOpen={showNewTaskForm}
            onCreated={(id) => {
              setShowNewTaskForm(false);
              setNewTaskTemplate(undefined);
              setSelectedTaskId(id as Id<"tasks">);
            }}
            onClose={() => {
              setShowNewTaskForm(false);
              setNewTaskTemplate(undefined);
            }}
          />
        </>
      ) : page === "projects" ? (
        <>
          {selectedProjectId ? (
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
              onSelectTask={(id) => {
                setSelectedTaskId(id);
              }}
            />
          ) : (
            <ProjectsView onSelectProject={setSelectedProjectId} />
          )}
          {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={handleCloseDetail} />}
        </>
      ) : page === "tags" ? (
        <TagsManager />
      ) : page === "fitness" ? (
        <FitnessDashboard />
      ) : page === "bodycomp" ? (
        <BodyCompDashboard />
      ) : page === "bloodlabs" ? (
        <BloodLabsDashboard />
      ) : null}
    </>
  );
}
