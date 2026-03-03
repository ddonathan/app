import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import TaskCard from "./TaskCard";

type TaskStatus = "inbox" | "active" | "backlog" | "done";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "inbox", label: "Inbox" },
  { status: "active", label: "Active" },
  { status: "backlog", label: "Backlog" },
  { status: "done", label: "Done" },
];

interface KanbanBoardProps {
  onSelectTask: (id: Id<"tasks">) => void;
}

function DraggableCard({ task, onSelect }: { task: Doc<"tasks">; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task._id,
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onSelect} isDragging={isDragging} />
    </div>
  );
}

function DroppableColumn({
  status,
  label,
  tasks,
  onSelectTask,
}: {
  status: TaskStatus;
  label: string;
  tasks: Doc<"tasks">[];
  onSelectTask: (id: Id<"tasks">) => void;
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
          <DraggableCard key={task._id} task={task} onSelect={() => onSelectTask(task._id)} />
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

export default function KanbanBoard({ onSelectTask }: KanbanBoardProps) {
  const tasks = useQuery(api.tasks.list, {});
  const moveTask = useMutation(api.tasks.move);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as Id<"tasks">;
    const targetStatus = over.id as string;

    // Only move if dropping on a column (not another card)
    const validStatuses: string[] = COLUMNS.map((c) => c.status);
    if (!validStatuses.includes(targetStatus)) return;

    // Find the task to check if status actually changed
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

  const tasksByStatus: Record<TaskStatus, Doc<"tasks">[]> = {
    inbox: [],
    active: [],
    backlog: [],
    done: [],
  };

  for (const task of tasks) {
    const col = tasksByStatus[task.status as TaskStatus];
    if (col) {
      col.push(task);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.status}
            status={col.status}
            label={col.label}
            tasks={tasksByStatus[col.status]}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
