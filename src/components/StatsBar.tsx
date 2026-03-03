import { useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Inbox, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";

export default function StatsBar() {
  const stats = useQuery(api.tasks.stats);

  if (!stats) return null;

  return (
    <div className="stats-bar">
      <div className="stat-item">
        <Inbox size={14} />
        Inbox
        <span className="stat-count">{stats.inbox}</span>
      </div>
      <div className="stat-item">
        <Zap size={14} />
        Active
        <span className="stat-count">{stats.active}</span>
      </div>
      <div className={`stat-item ${stats.overdue > 0 ? "overdue" : ""}`}>
        <AlertTriangle size={14} />
        Overdue
        <span className="stat-count">{stats.overdue}</span>
      </div>
      <div className="stat-item">
        <CheckCircle size={14} />
        Done
        <span className="stat-count">{stats.done}</span>
      </div>
    </div>
  );
}
