import { useMutation, useQuery } from "convex/react";
import {
  Archive,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";

type PriorityFilter = "all" | "urgent" | "action" | "fyi" | "low";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  action: "#f59e0b",
  fyi: "#3b82f6",
  low: "#6b7280",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  action: "Action",
  fyi: "FYI",
  low: "Low",
};

const SOURCE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  teams: MessageSquare,
  slack: Users,
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function TriageCard({ item }: { item: Doc<"triage"> }) {
  const [expanded, setExpanded] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [editedDraft, setEditedDraft] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const actMutation = useMutation(api.triage.act);

  const SourceIcon = SOURCE_ICONS[item.source] ?? Mail;
  const priorityColor = PRIORITY_COLORS[item.priority] ?? "#6b7280";

  const handleAct = async (action: string, snoozeUntil?: number) => {
    setSending(true);
    try {
      await actMutation({
        id: item._id,
        action,
        snoozeUntil,
        editedDraft: action === "reply" && editedDraft !== null ? editedDraft : undefined,
      });
    } finally {
      setSending(false);
    }
    setShowSnooze(false);
  };

  const snoozeOptions = [
    { label: "1 hour", ms: 60 * 60 * 1000 },
    { label: "Tomorrow 9am", ms: getNextMorningMs() },
    { label: "Next week", ms: 7 * 24 * 60 * 60 * 1000 },
  ];

  const currentDraft = editedDraft !== null ? editedDraft : item.draftReply;

  return (
    <div className="triage-card">
      <div className="triage-card-header" onClick={() => setExpanded(!expanded)}>
        <span className="triage-priority-badge" style={{ backgroundColor: priorityColor }}>
          {PRIORITY_LABELS[item.priority] ?? item.priority}
        </span>
        <SourceIcon size={14} className="triage-source-icon" />
        <span className="triage-from">{item.from}</span>
        {item.hasAttachments && <Paperclip size={12} className="triage-attachment" />}
        <span className="triage-time">{timeAgo(item.receivedAt)}</span>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>

      <div className="triage-card-subject">{item.subject}</div>
      <div className="triage-card-summary">{item.summary}</div>

      {expanded && (
        <div className="triage-card-expanded">
          {item.bodyPreview && (
            <div className="triage-preview">
              <p>{item.bodyPreview}</p>
            </div>
          )}

          {item.suggestedAction && (
            <div className="triage-suggested">
              Recommended: <strong>{item.suggestedAction}</strong>
              {item.category && (
                <>
                  {" · "}
                  <span className="triage-category">{item.category}</span>
                </>
              )}
            </div>
          )}

          {item.draftReply && (
            <div className="triage-draft">
              <div className="triage-draft-label">Draft Reply — edit below or approve as-is</div>
              <textarea
                className="triage-draft-editor"
                value={currentDraft ?? ""}
                onChange={(e) => setEditedDraft(e.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>
      )}

      <div className="triage-card-actions">
        {item.draftReply && (
          <button
            type="button"
            className="triage-btn triage-btn-primary"
            onClick={() => handleAct("reply")}
            disabled={sending}
            title="Approve & send draft"
          >
            <Send size={13} /> {editedDraft !== null && editedDraft !== item.draftReply ? "Send Edited" : "Approve Draft"}
          </button>
        )}
        <button type="button" className="triage-btn" onClick={() => handleAct("archive")} disabled={sending} title="Archive">
          <Archive size={13} /> Archive
        </button>
        <div className="triage-snooze-wrapper">
          <button type="button" className="triage-btn" onClick={() => setShowSnooze(!showSnooze)} title="Snooze">
            <Clock size={13} /> Snooze
          </button>
          {showSnooze && (
            <div className="triage-snooze-menu">
              {snoozeOptions.map((opt) => (
                <button key={opt.label} type="button" onClick={() => handleAct("snooze", Date.now() + opt.ms)}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="triage-btn" onClick={() => handleAct("delegate")} disabled={sending} title="Delegate">
          <ArrowRight size={13} /> Delegate
        </button>
        <button type="button" className="triage-btn triage-btn-danger" onClick={() => handleAct("dismiss")} disabled={sending} title="Dismiss">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

function getNextMorningMs(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

function MetricsPanel() {
  const metrics = useQuery(api.triage.metrics, { days: 30 });

  if (!metrics || metrics.total === 0) return null;

  return (
    <div className="triage-metrics">
      <div className="triage-metrics-header">
        <BarChart3 size={14} /> Learning Metrics (30d)
      </div>
      <div className="triage-metrics-grid">
        <div className="triage-metric">
          <div className="triage-metric-value">{metrics.actionAgreementRate}%</div>
          <div className="triage-metric-label">Action Agreement</div>
        </div>
        <div className="triage-metric">
          <div className="triage-metric-value">{metrics.draftAcceptanceRate}%</div>
          <div className="triage-metric-label">Draft Accepted As-Is</div>
        </div>
        <div className="triage-metric">
          <div className="triage-metric-value">{metrics.breakdown.totalActions}</div>
          <div className="triage-metric-label">Total Triaged</div>
        </div>
        {metrics.avgEditDistance > 0 && (
          <div className="triage-metric">
            <div className="triage-metric-value">{metrics.avgEditDistance}%</div>
            <div className="triage-metric-label">Avg Edit Distance</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TriageInbox() {
  const [filter, setFilter] = useState<PriorityFilter>("all");
  const items = useQuery(api.triage.list, {
    status: "pending",
    priority: filter === "all" ? undefined : filter,
  });
  const stats = useQuery(api.triage.stats, {});

  const filters: { key: PriorityFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "urgent", label: "Urgent" },
    { key: "action", label: "Action" },
    { key: "fyi", label: "FYI" },
    { key: "low", label: "Low" },
  ];

  return (
    <div className="triage-container">
      <MetricsPanel />

      {stats && (
        <div className="triage-stats">
          <span className="triage-stat">
            <strong>{stats.byStatus?.pending ?? 0}</strong> pending
          </span>
          {stats.byPriority?.urgent ? (
            <span className="triage-stat triage-stat-urgent">
              <strong>{stats.byPriority.urgent}</strong> urgent
            </span>
          ) : null}
          <span className="triage-stat">
            <strong>{stats.byStatus?.acted ?? 0}</strong> acted
          </span>
          <span className="triage-stat">
            <strong>{stats.byStatus?.snoozed ?? 0}</strong> snoozed
          </span>
        </div>
      )}

      <div className="triage-filters">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`triage-filter-btn${filter === f.key ? " active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== "all" && stats?.byPriority?.[f.key] ? (
              <span className="triage-filter-count">{stats.byPriority[f.key]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="triage-list">
        {items === undefined ? (
          <div className="triage-loading">Loading...</div>
        ) : items.length === 0 ? (
          <div className="triage-empty">
            <span className="triage-empty-icon">🎉</span>
            <p>Inbox zero</p>
          </div>
        ) : (
          items.map((item) => <TriageCard key={item._id} item={item} />)
        )}
      </div>
    </div>
  );
}
