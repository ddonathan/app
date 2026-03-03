import { useMutation, useQuery } from "convex/react";
import { Calendar, FolderPlus, Search, User } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type ProjectStatus = "active" | "on-hold" | "completed" | "archived";

const STATUS_TABS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "var(--green)",
  "on-hold": "var(--p3)",
  completed: "var(--accent)",
  archived: "var(--text-muted)",
};

function ProjectCard({ project, onClick }: { project: Doc<"projects">; onClick: () => void }) {
  const stats = useQuery(api.projects.stats, { id: project._id });

  return (
    <button type="button" className="project-card" onClick={onClick}>
      <div
        className="project-card-color-stripe"
        style={{ backgroundColor: project.color || "var(--accent)" }}
      />
      <div className="project-card-content">
        <div className="project-card-header">
          <span className="project-card-name">{project.name}</span>
          <span
            className="status-badge"
            style={{
              color: STATUS_COLORS[project.status],
              borderColor: STATUS_COLORS[project.status],
            }}
          >
            {project.status}
          </span>
        </div>
        {project.description && <div className="project-card-desc">{project.description}</div>}
        <div className="project-card-meta">
          {project.owner && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <User size={11} />
              {project.owner}
            </span>
          )}
          {project.client && <span style={{ opacity: 0.7 }}>{project.client}</span>}
          {project.dueDate && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Calendar size={11} />
              {project.dueDate}
            </span>
          )}
        </div>
        {stats && (
          <div className="project-card-progress">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${stats.completionPct}%` }} />
            </div>
            <span className="progress-label">
              {stats.done}/{stats.total} tasks ({stats.completionPct}%)
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function NewProjectForm({ onClose }: { onClose: () => void }) {
  const createProject = useMutation(api.projects.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#58a6ff");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [owner, setOwner] = useState("");
  const [client, setClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createProject({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      status,
      owner: owner.trim() || undefined,
      client: client.trim() || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    });

    onClose();
  };

  return (
    <div
      className="quick-capture-overlay"
      role="none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <form className="quick-capture-form" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <h3>New Project</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name..."
          autoFocus
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)..."
        />
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="np-color" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Color
            </label>
            <input
              id="np-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: "100%", height: 32 }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label htmlFor="np-status" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Status
            </label>
            <select
              id="np-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              style={{ width: "100%" }}
            >
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="Owner (e.g. own-dan)"
            style={{ flex: 1 }}
          />
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client (e.g. c-acme)"
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="np-start" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Start Date
            </label>
            <input
              id="np-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="np-due" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Due Date
            </label>
            <input
              id="np-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit">Create</button>
        </div>
      </form>
    </div>
  );
}

export default function ProjectsView({
  onSelectProject,
}: {
  onSelectProject: (id: Id<"projects">) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [searchText, setSearchText] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const projects = useQuery(api.projects.list, {
    status: statusFilter !== "all" ? statusFilter : undefined,
    includeArchived: statusFilter === "archived" || statusFilter === "all" ? true : undefined,
  });

  if (!projects) {
    return <div className="empty-state">Loading projects...</div>;
  }

  const filtered = searchText.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (p.description ?? "").toLowerCase().includes(searchText.toLowerCase()) ||
          (p.client ?? "").toLowerCase().includes(searchText.toLowerCase()),
      )
    : projects;

  return (
    <div className="projects-view">
      <div className="projects-toolbar">
        <div className="projects-status-tabs">
          {STATUS_TABS.map((tab) => (
            <button
              type="button"
              key={tab.value}
              className={`status-tab${statusFilter === tab.value ? " active" : ""}`}
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="projects-toolbar-right">
          <div className="search-wrapper" style={{ maxWidth: 240 }}>
            <Search size={14} className="search-icon" />
            <input
              placeholder="Search projects..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button type="button" className="new-project-btn" onClick={() => setShowNewForm(true)}>
            <FolderPlus size={14} />
            New Project
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {searchText ? "No projects match your search" : "No projects yet"}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onClick={() => onSelectProject(project._id)}
            />
          ))}
        </div>
      )}

      {showNewForm && <NewProjectForm onClose={() => setShowNewForm(false)} />}
    </div>
  );
}
