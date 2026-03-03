import { Calendar, User } from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

interface TaskCardProps {
  task: Doc<"tasks">;
  onClick: () => void;
  isDragging?: boolean;
}

function getPriority(tags: string[]): string | null {
  for (const tag of tags) {
    if (tag === "p1" || tag === "p2" || tag === "p3" || tag === "p4") {
      return tag;
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

export default function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const priority = getPriority(task.tags);

  return (
    <div className={`task-card${isDragging ? " dragging" : ""}`} onClick={onClick}>
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        {priority && (
          <span className={`priority-badge ${priority}`}>{priorityLabels[priority]}</span>
        )}
        {task.owner && (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <User size={11} />
            {task.owner}
          </span>
        )}
        {task.dueDate && (
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Calendar size={11} />
            {task.dueDate}
          </span>
        )}
        {task.clientName && <span style={{ opacity: 0.7 }}>{task.clientName}</span>}
      </div>
    </div>
  );
}
