import { useMutation, useQuery } from "convex/react";
import { Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type TaskStatus = "inbox" | "active" | "backlog" | "done" | "someday";

interface TaskDetailProps {
  taskId: Id<"tasks">;
  onClose: () => void;
}

const STATUS_OPTIONS: TaskStatus[] = ["inbox", "active", "backlog", "done", "someday"];

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function computeEtaGap(
  promised: string | undefined,
  realistic: string | undefined,
): { label: string; className: string } | null {
  if (!promised || !realistic) return null;
  const p = new Date(promised).getTime();
  const r = new Date(realistic).getTime();
  const diffDays = Math.round((r - p) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { label: "On track", className: "green" };
  } else if (diffDays <= 7) {
    return { label: `${diffDays}d gap`, className: "yellow" };
  } else {
    return { label: `${diffDays}d gap`, className: "red" };
  }
}

export default function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const task = useQuery(api.tasks.get, { id: taskId });
  const updateTask = useMutation(api.tasks.update);
  const moveTask = useMutation(api.tasks.move);
  const addLog = useMutation(api.tasks.addLog);

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [waitingOn, setWaitingOn] = useState("");
  const [agenda, setAgenda] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [promisedEta, setPromisedEta] = useState("");
  const [realisticEta, setRealisticEta] = useState("");
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [logEntry, setLogEntry] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setOwner(task.owner);
      setWaitingOn(task.waitingOn ?? "");
      setAgenda(task.agenda ?? "");
      setStartDate(task.startDate ?? "");
      setDueDate(task.dueDate ?? "");
      setFollowUpDate(task.followUpDate ?? "");
      setPromisedEta(task.promisedEta ?? "");
      setRealisticEta(task.realisticEta ?? "");
      setNotes(task.notes);
      setClientName(task.clientName ?? "");
      setSource(task.source ?? "");
      setTags([...task.tags]);
      setDirty(false);
    }
  }, [task]);

  if (!task) {
    return (
      <>
        <div className="detail-overlay" onClick={onClose} />
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h2>Loading...</h2>
            <button onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
      </>
    );
  }

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    await updateTask({
      id: taskId,
      title,
      owner,
      waitingOn: waitingOn || undefined,
      agenda: agenda || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      followUpDate: followUpDate || undefined,
      promisedEta: promisedEta || undefined,
      realisticEta: realisticEta || undefined,
      notes,
      clientName: clientName || undefined,
      source: source || undefined,
      tags,
    });
    setDirty(false);
  };

  const handleMove = async (status: TaskStatus) => {
    await moveTask({ id: taskId, status });
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logEntry.trim()) return;
    await addLog({ id: taskId, entry: logEntry.trim() });
    setLogEntry("");
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        markDirty();
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
    markDirty();
  };

  const etaGap = computeEtaGap(promisedEta, realisticEta);

  const moveTargets = STATUS_OPTIONS.filter((s) => s !== task.status);

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-panel-header">
          <h2>Task Detail</h2>
          <button onClick={onClose} style={{ background: "none", border: "none" }}>
            <X size={18} />
          </button>
        </div>
        <div className="detail-panel-body">
          {/* Title */}
          <div className="detail-field">
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
            />
          </div>

          {/* Status + Move actions */}
          <div className="detail-field">
            <label>
              Status: <span className={`status-badge ${task.status}`}>{task.status}</span>
            </label>
            <div className="detail-actions">
              {moveTargets.map((s) => (
                <button key={s} onClick={() => handleMove(s)}>
                  Move to {s}
                </button>
              ))}
            </div>
          </div>

          {/* Owner / Client */}
          <div className="detail-field-row">
            <div className="detail-field">
              <label>Owner</label>
              <input
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="detail-field">
              <label>Client</label>
              <input
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>

          {/* Waiting On / Agenda */}
          <div className="detail-field-row">
            <div className="detail-field">
              <label>Waiting On</label>
              <input
                value={waitingOn}
                onChange={(e) => {
                  setWaitingOn(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="detail-field">
              <label>Agenda</label>
              <input
                value={agenda}
                onChange={(e) => {
                  setAgenda(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="detail-field-row">
            <div className="detail-field">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="detail-field">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>

          <div className="detail-field-row">
            <div className="detail-field">
              <label>Follow-up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="detail-field">
              <label>Source</label>
              <input
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>

          {/* ETA */}
          <div className="detail-field-row">
            <div className="detail-field">
              <label>Promised ETA</label>
              <input
                type="date"
                value={promisedEta}
                onChange={(e) => {
                  setPromisedEta(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div className="detail-field">
              <label>Realistic ETA</label>
              <input
                type="date"
                value={realisticEta}
                onChange={(e) => {
                  setRealisticEta(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>

          {etaGap && (
            <div className={`eta-gap ${etaGap.className}`}>
              <Clock size={14} />
              ETA Gap: {etaGap.label}
            </div>
          )}

          {/* Tags */}
          <div className="detail-field">
            <label>Tags</label>
            <div className="tags-input-wrapper">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag..."
              />
            </div>
          </div>

          {/* Notes */}
          <div className="detail-field">
            <label>Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                markDirty();
              }}
            />
          </div>

          {/* Save */}
          {dirty && (
            <button className="btn-primary" onClick={handleSave}>
              Save Changes
            </button>
          )}

          {/* Log */}
          <div className="detail-field">
            <label>Activity Log</label>
            <div className="log-timeline">
              {task.log.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                  No log entries yet.
                </div>
              )}
              {task.log
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((entry, i) => (
                  <div key={i} className="log-entry">
                    <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
                    <span className="log-text">{entry.entry}</span>
                  </div>
                ))}
            </div>
            <form className="log-add-form" onSubmit={handleAddLog}>
              <input
                value={logEntry}
                onChange={(e) => setLogEntry(e.target.value)}
                placeholder="Add log entry..."
              />
              <button type="submit">Add</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
