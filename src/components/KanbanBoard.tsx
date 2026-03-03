import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import TaskCard from "./TaskCard";

type TaskStatus = "inbox" | "active" | "backlog" | "done";

const ALL_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "inbox", label: "Inbox" },
  { status: "backlog", label: "Backlog" },
  { status: "active", label: "Active" },
  { status: "done", label: "Done" },
];

const TAG_PREFIXES = ["@", "p-", "c-", "#", "!"];

function matchesFilter(task: Doc<"tasks">, filterText: string): boolean {
  if (!filterText.trim()) return true;
  const terms = filterText.trim().split(/\s+/);
  return terms.every((term) => {
    const isTagTerm = TAG_PREFIXES.some((p) => term.startsWith(p));
    if (isTagTerm) {
      return task.tags.some((tag) => tag.toLowerCase() === term.toLowerCase());
    }
    const lower = term.toLowerCase();
    return (
      task.title.toLowerCase().includes(lower) || (task.notes ?? "").toLowerCase().includes(lower)
    );
  });
}

interface KanbanBoardProps {
  onSelectTask: (id: Id<"tasks">) => void;
  showAll: boolean;
  filterText: string;
  onTagClick: (tag: string) => void;
}

function DraggableCard({
  task,
  onSelect,
  onTagClick,
}: {
  task: Doc<"tasks">;
  onSelect: () => void;
  onTagClick?: (tag: string) => void;
  onOpenTask?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task._id,
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={onSelect}
        isDragging={isDragging}
        onTagClick={onTagClick}
        onOpenTask={onOpenTask}
      />
    </div>
  );
}

function DroppableColumn({
  status,
  label,
  tasks,
  onSelectTask,
  onTagClick,
}: {
  status: TaskStatus;
  label: string;
  tasks: Doc<"tasks">[];
  onSelectTask: (id: Id<"tasks">) => void;
  onTagClick?: (tag: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className={`kanban-column${isOver ? " drag-over" : ""}`}>
      <div className="kanban-column-header">
        {label}
        <span className="column-count">{tasks.length}</span>
      </div>
      <div className="kanban-column-body" ref={setNodeRef}>
        {tasks.map((task) => (
          <DraggableCard
            key={task._id}
            task={task}
            onSelect={() => onSelectTask(task._id)}
            onTagClick={onTagClick}
            onOpenTask={(id) => onSelectTask(id as Id<"tasks">)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="empty-state" style={{ padding: 20 }}>
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  onSelectTask,
  showAll,
  filterText,
  onTagClick,
}: KanbanBoardProps) {
  const tasks = useQuery(api.tasks.list, {});
  const moveTask = useMutation(api.tasks.move);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const columns = showAll ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => c.status !== "done");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as Id<"tasks">;
    const targetStatus = over.id as string;

    const validStatuses: string[] = ALL_COLUMNS.map((c) => c.status);
    if (!validStatuses.includes(targetStatus)) return;

    const task = tasks?.find((t) => t._id === taskId);
    if (!task || task.status === targetStatus) return;

    void moveTask({
      id: taskId,
      status: targetStatus as TaskStatus,
    });
  };

  if (!tasks) {
    return (
      <div className="kanban-board">
        <div className="empty-state">Loading tasks...</div>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const tasksByStatus: Record<TaskStatus, Doc<"tasks">[]> = {
    inbox: [],
    active: [],
    backlog: [],
    done: [],
  };

  for (const task of tasks) {
    // Filter out future startDate tasks unless showAll
    if (!showAll && task.startDate && task.startDate > today) {
      continue;
    }
    // Apply text filter
    if (!matchesFilter(task, filterText)) {
      continue;
    }
    const col = tasksByStatus[task.status as TaskStatus];
    if (col) {
      col.push(task);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {columns.map((col) => (
          <DroppableColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={tasksByStatus[col.status]}
            onSelectTask={onSelectTask}
            onTagClick={onTagClick}
          />
        ))}
      </div>
    </DndContext>
  );
}
