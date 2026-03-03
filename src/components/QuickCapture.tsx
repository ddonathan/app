import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type TaskStatus = "inbox" | "active" | "backlog" | "done" | "someday";

export interface TaskTemplate {
  tags?: string[];
  projectId?: string;
  status?: TaskStatus;
}

export default function QuickCapture({
  projectId: defaultProjectId,
  template,
  onCreated,
  onClose,
  forceOpen,
}: {
  projectId?: Id<"projects">;
  template?: TaskTemplate;
  onCreated?: (id: string) => void;
  onClose?: () => void;
  forceOpen?: boolean;
} = {}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [status, setStatus] = useState<TaskStatus>("inbox");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [promisedEta, setPromisedEta] = useState("");
  const [realisticEta, setRealisticEta] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const createTask = useMutation(api.tasks.create);
  const projects = useQuery(api.projects.list, {});

  const isOpen = forceOpen || open;

  // Apply template when it changes
  useEffect(() => {
    if (template) {
      setTagsStr(template.tags?.join(", ") ?? "");
      setSelectedProjectId(template.projectId ?? "");
      setStatus(template.status ?? "inbox");
      setTitle("");
      setNotes("");
      setDueDate("");
      setStartDate("");
      setPromisedEta("");
      setRealisticEta("");
    }
  }, [template]);

  // Apply default projectId
  useEffect(() => {
    if (defaultProjectId && !selectedProjectId) {
      setSelectedProjectId(defaultProjectId);
    }
  }, [defaultProjectId, selectedProjectId]);

  useEffect(() => {
    if (isOpen && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setTagsStr("");
    setStatus("inbox");
    setSelectedProjectId(defaultProjectId ?? "");
    setDueDate("");
    setStartDate("");
    setPromisedEta("");
    setRealisticEta("");
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const id = await createTask({
      title: title.trim(),
      status,
      tags: tags.length > 0 ? tags : undefined,
      notes: notes || undefined,
      projectId: selectedProjectId ? (selectedProjectId as Id<"projects">) : defaultProjectId,
      dueDate: dueDate || undefined,
      startDate: startDate || undefined,
      promisedEta: promisedEta || undefined,
      realisticEta: realisticEta || undefined,
    });

    onCreated?.(id);
    handleClose();
  };

  return (
    <>
      {!forceOpen && (
        <button type="button" className="quick-capture-btn" onClick={() => setOpen(true)}>
          <Plus size={24} />
        </button>
      )}

      {isOpen && (
        <div
          className="quick-capture-overlay"
          role="none"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleClose();
          }}
        >
          <form className="quick-capture-form full-form" onSubmit={handleSubmit}>
            <h3>New Task</h3>

            <div className="form-field">
              <label htmlFor="new-title">Title</label>
              <input
                id="new-title"
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
              />
            </div>

            <div className="form-field">
              <label htmlFor="new-notes">Notes</label>
              <textarea
                id="new-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details, context, links..."
                rows={3}
              />
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="new-status">Status</label>
                <select
                  id="new-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  <option value="inbox">Inbox</option>
                  <option value="backlog">Backlog</option>
                  <option value="active">Active</option>
                  <option value="someday">Someday</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="new-project">Project</label>
                <select
                  id="new-project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">No project</option>
                  {projects?.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="new-tags">Tags</label>
              <input
                id="new-tags"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="@context, p-person, c-client, !p1, #project..."
              />
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="new-due">Due Date</label>
                <input
                  id="new-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-start">Start Date</label>
                <input
                  id="new-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label htmlFor="new-promised">Promised ETA</label>
                <input
                  id="new-promised"
                  type="date"
                  value={promisedEta}
                  onChange={(e) => setPromisedEta(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-realistic">Realistic ETA</label>
                <input
                  id="new-realistic"
                  type="date"
                  value={realisticEta}
                  onChange={(e) => setRealisticEta(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="primary">
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
