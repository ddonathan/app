import { useQuery } from "convex/react";
import { Calendar, User } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

interface TaskCardProps {
  task: Doc<"tasks">;
  onClick: () => void;
  isDragging?: boolean;
  onTagClick?: (tag: string) => void;
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

export default function TaskCard({ task, onClick, isDragging, onTagClick }: TaskCardProps) {
  const priority = getPriority(task.tags);
  const owner = findTagByPrefix(task.tags, "own-");
  const client = findTagByPrefix(task.tags, "c-");
  const project = useQuery(api.projects.get, task.projectId ? { id: task.projectId } : "skip");

  return (
    <button type="button" className={`task-card${isDragging ? " dragging" : ""}`} onClick={onClick}>
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
  );
}
