import { useMutation, useQuery } from "convex/react";
import { Calendar, User } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import ContextMenu from "./ContextMenu";

interface TaskCardProps {
  task: Doc<"tasks">;
  onClick: () => void;
  isDragging?: boolean;
  onTagClick?: (tag: string) => void;
  onOpenTask?: (id: string) => void;
}

function getPriority(tags: string[]): string | null {
  for (const tag of tags) {
    if (tag === "!p1" || tag === "!p2" || tag === "!p3" || tag === "!p4") {
      return tag.slice(1); // return "p1", "p2", etc. for CSS class
    }
  }
  return null;
}

function findTagByPrefix(tags: string[], prefix: string): string | null {
  for (const tag of tags) {
    if (tag.startsWith(prefix)) {
      return tag.slice(prefix.length);
    }
  }
  return null;
}

const priorityLabels: Record<string, string> = {
  p1: "Urgent",
  p2: "High",
  p3: "Medium",
  p4: "Low",
};

export default function TaskCard({
  task,
  onClick,
  isDragging,
  onTagClick,
  onOpenTask,
}: TaskCardProps) {
  const priority = getPriority(task.tags);
  const owner = findTagByPrefix(task.tags, "own-");
  const client = findTagByPrefix(task.tags, "c-");
  const project = useQuery(api.projects.get, task.projectId ? { id: task.projectId } : "skip");
  const updateTask = useMutation(api.tasks.update);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(task._id);
    setContextMenu(null);
  }, [task._id]);

  const createTask = useMutation(api.tasks.create);

  const handleCloseAndNew = useCallback(async () => {
    updateTask({ id: task._id, status: "done" });
    const newId = await createTask({
      title: "",
      status: "inbox",
      tags: task.tags,
      projectId: task.projectId,
    });
    onOpenTask?.(newId);
    setContextMenu(null);
  }, [task, updateTask, createTask, onOpenTask]);

  return (
    <>
      <button
        type="button"
        className={`task-card${isDragging ? " dragging" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        {project && (
          <div
            className="task-card-project-stripe"
            style={{ backgroundColor: project.color || "var(--accent)" }}
            title={project.name}
          />
        )}
        <div className="task-card-title">{task.title}</div>
        <div className="task-card-meta">
          {priority && (
            <span className={`priority-badge ${priority}`}>{priorityLabels[priority]}</span>
          )}
          {owner && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <User size={11} />
              {owner}
            </span>
          )}
          {task.dueDate && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Calendar size={11} />
              {task.dueDate}
            </span>
          )}
          {client && <span style={{ opacity: 0.7 }}>{client}</span>}
        </div>
        {task.tags.length > 0 && (
          <div className="task-card-tags">
            {task.tags.map((tag) => (
              <button
                type="button"
                key={tag}
                className="tag-chip clickable"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(tag);
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </button>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "Copy Task ID",
              icon: "📋",
              onClick: handleCopyId,
            },
            {
              label: "Close & New (same project/tags)",
              icon: "🔄",
              onClick: handleCloseAndNew,
              divider: true,
            },
          ]}
        />
      )}
    </>
  );
}
