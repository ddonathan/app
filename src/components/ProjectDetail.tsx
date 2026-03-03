import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Calendar, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type ProjectStatus = "active" | "on-hold" | "completed" | "archived";

const STATUS_OPTIONS: ProjectStatus[] = ["active", "on-hold", "completed", "archived"];

function ProjectTaskCard({ task, onSelect }: { task: Doc<"tasks">; onSelect: () => void }) {
  return (
    <button type="button" className="task-card" onClick={onSelect}>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        <span className={`status-badge ${task.status}`}>{task.status}</span>
        {task.dueDate && (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Calendar size={11} />
            {task.dueDate}
          </span>
        )}
      </div>
    </button>
  );
}

export default function ProjectDetail({
  projectId,
  onBack,
  onSelectTask,
}: {
  projectId: Id<"projects">;
  onBack: () => void;
  onSelectTask: (id: Id<"tasks">) => void;
}) {
  const data = useQuery(api.projects.withTasks, { id: projectId });
  const stats = useQuery(api.projects.stats, { id: projectId });
  const updateProject = useMutation(api.projects.update);
  const removeProject = useMutation(api.projects.remove);
  const createTask = useMutation(api.tasks.create);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#58a6ff");
  const [owner, setOwner] = useState("");
  const [client, setClient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    if (data) {
      setName(data.name);
      setDescription(data.description ?? "");
      setColor(data.color ?? "#58a6ff");
      setOwner(data.owner ?? "");
      setClient(data.client ?? "");
      setStartDate(data.startDate ?? "");
      setDueDate(data.dueDate ?? "");
    }
  }, [data]);

  if (!data) {
    return <div className="empty-state">Loading project...</div>;
  }

  const handleBlur = (field: string, value: string) => {
    const current =
      field === "name" ? data.name : field === "description" ? (data.description ?? "") : undefined;
    if (value !== current) {
      updateProject({ id: projectId, [field]: value || undefined });
    }
  };

  const handleDateChange = (field: string, value: string) => {
    updateProject({ id: projectId, [field]: value || undefined });
  };

  const handleStatusChange = (status: ProjectStatus) => {
    updateProject({ id: projectId, status });
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    updateProject({ id: projectId, color: newColor });
  };

  const handleDelete = async () => {
    await removeProject({ id: projectId });
    onBack();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await createTask({
      title: newTaskTitle.trim(),
      status: "inbox",
      projectId,
    });
    setNewTaskTitle("");
  };

  const tasksByStatus: Record<string, Doc<"tasks">[]> = {
    active: [],
    inbox: [],
    backlog: [],
    done: [],
    someday: [],
  };
  for (const task of data.tasks) {
    const bucket = tasksByStatus[task.status];
    if (bucket) bucket.push(task);
  }

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Projects
        </button>
        <button type="button" className="delete-btn" onClick={handleDelete} title="Delete project">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="project-detail-body">
        {/* Name + color */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            style={{ width: 36, height: 36, border: "none", cursor: "pointer" }}
          />
          <input
            className="project-name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => handleBlur("name", name)}
          />
        </div>

        {/* Description */}
        <textarea
          className="project-desc-input"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => handleBlur("description", description)}
          placeholder="Add a description..."
        />

        {/* Status, owner, client, dates */}
        <div className="project-detail-meta">
          <div className="detail-field">
            <label htmlFor="pd-status">Status</label>
            <select
              id="pd-status"
              value={data.status}
              onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="detail-field">
            <label htmlFor="pd-owner">Owner</label>
            <input
              id="pd-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              onBlur={() => handleBlur("owner", owner)}
              placeholder="e.g. own-dan"
            />
          </div>
          <div className="detail-field">
            <label htmlFor="pd-client">Client</label>
            <input
              id="pd-client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              onBlur={() => handleBlur("client", client)}
              placeholder="e.g. c-acme"
            />
          </div>
          <div className="detail-field">
            <label htmlFor="pd-start">Start Date</label>
            <input
              id="pd-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleDateChange("startDate", e.target.value);
              }}
            />
          </div>
          <div className="detail-field">
            <label htmlFor="pd-due">Due Date</label>
            <input
              id="pd-due"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                handleDateChange("dueDate", e.target.value);
              }}
            />
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="project-stats-bar">
            <div className="project-stats-row">
              <span>
                Completion: <strong>{stats.completionPct}%</strong>
              </span>
              <span>
                Total: <strong>{stats.total}</strong>
              </span>
              <span>
                Done: <strong style={{ color: "var(--green)" }}>{stats.done}</strong>
              </span>
              <span>
                Active: <strong style={{ color: "var(--accent)" }}>{stats.active}</strong>
              </span>
              <span>
                Overdue: <strong style={{ color: "var(--p1)" }}>{stats.overdue}</strong>
              </span>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${stats.completionPct}%` }} />
            </div>
          </div>
        )}

        {/* Add task */}
        <form className="project-add-task" onSubmit={handleAddTask}>
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task to this project..."
          />
          <button type="submit">
            <Plus size={14} /> Add
          </button>
        </form>

        {/* Tasks grouped by status */}
        {(["active", "inbox", "backlog", "someday", "done"] as const).map((status) => {
          const tasks = tasksByStatus[status];
          if (!tasks || tasks.length === 0) return null;
          return (
            <div key={status} className="project-task-group">
              <h4>
                <span className={`status-badge ${status}`}>{status}</span>
                <span className="column-count">{tasks.length}</span>
              </h4>
              {tasks.map((task) => (
                <ProjectTaskCard
                  key={task._id}
                  task={task}
                  onSelect={() => onSelectTask(task._id)}
                />
              ))}
            </div>
          );
        })}

        {data.tasks.length === 0 && <div className="empty-state">No tasks in this project yet</div>}
      </div>
    </div>
  );
}
