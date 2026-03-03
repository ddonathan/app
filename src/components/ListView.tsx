import { useQuery } from "convex/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type TaskStatus = "inbox" | "active" | "backlog" | "done" | "someday";
type SortField = "title" | "status" | "owner" | "dueDate" | "clientName";
type SortDir = "asc" | "desc";

interface ListViewProps {
  onSelectTask: (id: Id<"tasks">) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "inbox", label: "Inbox" },
  { value: "active", label: "Active" },
  { value: "backlog", label: "Backlog" },
  { value: "done", label: "Done" },
  { value: "someday", label: "Someday" },
];

export default function ListView({ onSelectTask }: ListViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterOwner, setFilterOwner] = useState("");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const queryArgs = filterStatus ? { status: filterStatus as TaskStatus } : {};
  const tasks = useQuery(api.tasks.list, queryArgs);

  const filteredAndSorted = useMemo(() => {
    if (!tasks) return [];

    let result = tasks;

    if (filterOwner) {
      const lower = filterOwner.toLowerCase();
      result = result.filter((t) => t.owner.toLowerCase().includes(lower));
    }

    result = [...result].sort((a, b) => {
      const valA = getFieldValue(a, sortField);
      const valB = getFieldValue(b, sortField);
      const cmp = valA.localeCompare(valB);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [tasks, filterOwner, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="sort-arrow">
        {sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      </span>
    );
  };

  if (!tasks) {
    return (
      <div className="list-view-wrapper">
        <div className="empty-state">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="list-view-wrapper">
      <div className="list-filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Filter by owner..."
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
        />
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="empty-state">No tasks match your filters.</div>
      ) : (
        <table className="list-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort("title")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("title");
                }}
                tabIndex={0}
              >
                Title <SortArrow field="title" />
              </th>
              <th
                onClick={() => handleSort("status")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("status");
                }}
                tabIndex={0}
              >
                Status <SortArrow field="status" />
              </th>
              <th
                onClick={() => handleSort("owner")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("owner");
                }}
                tabIndex={0}
              >
                Owner <SortArrow field="owner" />
              </th>
              <th
                onClick={() => handleSort("dueDate")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("dueDate");
                }}
                tabIndex={0}
              >
                Due Date <SortArrow field="dueDate" />
              </th>
              <th
                onClick={() => handleSort("clientName")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("clientName");
                }}
                tabIndex={0}
              >
                Client <SortArrow field="clientName" />
              </th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((task) => (
              <tr
                key={task._id}
                onClick={() => onSelectTask(task._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectTask(task._id);
                }}
                tabIndex={0}
              >
                <td>{task.title}</td>
                <td>
                  <span className={`status-badge ${task.status}`}>{task.status}</span>
                </td>
                <td style={{ color: task.owner ? "var(--text)" : "var(--text-muted)" }}>
                  {task.owner || "--"}
                </td>
                <td style={{ color: task.dueDate ? "var(--text)" : "var(--text-muted)" }}>
                  {task.dueDate || "--"}
                </td>
                <td style={{ color: task.clientName ? "var(--text)" : "var(--text-muted)" }}>
                  {task.clientName || "--"}
                </td>
                <td>
                  {task.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function getFieldValue(task: Doc<"tasks">, field: SortField): string {
  switch (field) {
    case "title":
      return task.title;
    case "status":
      return task.status;
    case "owner":
      return task.owner;
    case "dueDate":
      return task.dueDate ?? "";
    case "clientName":
      return task.clientName ?? "";
  }
}
