import { useMutation, useQuery } from "convex/react";
import { Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type TagType =
  | "context"
  | "person"
  | "client"
  | "project"
  | "priority"
  | "owner"
  | "source"
  | "other";

const TAG_TYPES: { value: TagType; label: string; prefix: string }[] = [
  { value: "context", label: "Context", prefix: "@" },
  { value: "person", label: "Person", prefix: "p-" },
  { value: "client", label: "Client", prefix: "c-" },
  { value: "project", label: "Project", prefix: "#" },
  { value: "priority", label: "Priority", prefix: "!" },
  { value: "owner", label: "Owner", prefix: "own-" },
  { value: "source", label: "Source", prefix: "src-" },
  { value: "other", label: "Other", prefix: "" },
];

const TYPE_COLORS: Record<TagType, string> = {
  context: "#58a6ff",
  person: "#3fb950",
  client: "#a371f7",
  project: "#d29922",
  priority: "#f85149",
  owner: "#3fb4b0",
  source: "#f0883e",
  other: "#8b949e",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHour(h: number): string {
  const hour = Math.floor(h);
  const min = Math.round((h - hour) * 60);
  return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function parseHourStr(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}

function TagUsageCount({ name }: { name: string }) {
  const result = useQuery(api.tags.usageCount, { name });
  if (result === undefined) return <span className="tag-usage-count">...</span>;
  return <span className="tag-usage-count">{result.count} tasks</span>;
}

function AutoFocusInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return <input ref={ref} {...props} />;
}

interface NewTagForm {
  name: string;
  type: TagType;
  color: string;
  description: string;
}

export default function TagsManager() {
  const tags = useQuery(api.tags.list, { includeArchived: true });
  const createTag = useMutation(api.tags.create);
  const updateTag = useMutation(api.tags.update);
  const removeTag = useMutation(api.tags.remove);

  const [filter, setFilter] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState<NewTagForm>({
    name: "",
    type: "context",
    color: "#58a6ff",
    description: "",
  });

  // Inline editing state
  const [editingField, setEditingField] = useState<{
    id: Id<"tags">;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedTimeRule, setExpandedTimeRule] = useState<Id<"tags"> | null>(null);

  const filteredTags = useMemo(() => {
    if (!tags) return [];
    if (!filter.trim()) return tags;
    const lower = filter.toLowerCase();
    return tags.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.type.toLowerCase().includes(lower) ||
        t.description?.toLowerCase().includes(lower),
    );
  }, [tags, filter]);

  const groupedTags = useMemo(() => {
    const groups: Record<string, typeof filteredTags> = {};
    for (const tagType of TAG_TYPES) {
      const matching = filteredTags.filter((t) => t.type === tagType.value);
      if (matching.length > 0) {
        groups[tagType.value] = matching;
      }
    }
    return groups;
  }, [filteredTags]);

  const handleCreate = async () => {
    if (!newTag.name.trim()) return;
    await createTag({
      name: newTag.name.trim(),
      type: newTag.type,
      color: newTag.color,
      description: newTag.description || undefined,
    });
    setNewTag({ name: "", type: "context", color: "#58a6ff", description: "" });
    setAdding(false);
  };

  const startEdit = (id: Id<"tags">, field: string, currentValue: string) => {
    setEditingField({ id, field });
    setEditValue(currentValue);
  };

  const commitEdit = async () => {
    if (!editingField) return;
    const { id, field } = editingField;
    if (field === "name" && editValue.trim()) {
      await updateTag({ id, name: editValue.trim() });
    } else if (field === "description") {
      await updateTag({ id, description: editValue });
    }
    setEditingField(null);
    setEditValue("");
  };

  const handleColorChange = async (id: Id<"tags">, color: string) => {
    await updateTag({ id, color });
  };

  const handleTypeChange = async (id: Id<"tags">, type: TagType) => {
    await updateTag({ id, type });
  };

  const handleArchiveToggle = async (id: Id<"tags">, currentArchived: boolean | undefined) => {
    await updateTag({ id, archived: !currentArchived });
  };

  const handleDelete = async (id: Id<"tags">) => {
    await removeTag({ id });
  };

  const handleTimeRuleHours = async (
    id: Id<"tags">,
    currentRule: { hours?: number[]; days?: string[] } | undefined,
    startHour: number,
    endHour: number,
  ) => {
    await updateTag({
      id,
      timeRule: {
        hours: [startHour, endHour],
        days: currentRule?.days,
      },
    });
  };

  const handleTimeRuleDays = async (
    id: Id<"tags">,
    currentRule: { hours?: number[]; days?: string[] } | undefined,
    day: string,
  ) => {
    const currentDays = currentRule?.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day];
    await updateTag({
      id,
      timeRule: {
        hours: currentRule?.hours,
        days: newDays.length > 0 ? newDays : undefined,
      },
    });
  };

  if (tags === undefined) {
    return (
      <div className="tags-manager">
        <p style={{ color: "var(--text-muted)" }}>Loading tags...</p>
      </div>
    );
  }

  return (
    <div className="tags-manager">
      <div className="tags-manager-header">
        <input
          placeholder="Filter tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary"
          onClick={() => setAdding(true)}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <Plus size={14} /> Add Tag
        </button>
      </div>

      {/* New tag form */}
      {adding && (
        <div className="tag-row-new">
          <AutoFocusInput
            placeholder="Tag name"
            value={newTag.name}
            onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
              if (e.key === "Escape") setAdding(false);
            }}
          />
          <select
            value={newTag.type}
            onChange={(e) => setNewTag({ ...newTag, type: e.target.value as TagType })}
          >
            {TAG_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.prefix ? `${t.prefix} ` : ""}
                {t.label}
              </option>
            ))}
          </select>
          <div className="tag-color-swatch" style={{ backgroundColor: newTag.color }}>
            <input
              type="color"
              value={newTag.color}
              onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
            />
          </div>
          <input
            placeholder="Description (optional)"
            value={newTag.description}
            onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
            style={{ flex: 1 }}
          />
          <button type="button" className="btn-primary" onClick={() => void handleCreate()}>
            Save
          </button>
          <button type="button" onClick={() => setAdding(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* Grouped tags */}
      {Object.entries(groupedTags).map(([type, typeTags]) => {
        const typeInfo = TAG_TYPES.find((t) => t.value === type);
        return (
          <div key={type} className="tags-type-group">
            <h3>
              {typeInfo?.prefix ? `${typeInfo.prefix} ` : ""}
              {typeInfo?.label || type}
            </h3>
            {typeTags.map((tag) => (
              <div key={tag._id} className="tag-row" style={{ opacity: tag.archived ? 0.5 : 1 }}>
                {/* Name */}
                <div className="tag-name">
                  {editingField?.id === tag._id && editingField.field === "name" ? (
                    <AutoFocusInput
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => void commitEdit()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitEdit();
                        if (e.key === "Escape") setEditingField(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(tag._id, "name", tag.name)}
                      style={{
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        font: "inherit",
                        fontWeight: "inherit",
                      }}
                    >
                      {tag.name}
                    </button>
                  )}
                </div>

                {/* Type badge */}
                <span
                  className="tag-type-badge"
                  style={{
                    backgroundColor: `${TYPE_COLORS[tag.type as TagType]}20`,
                    color: TYPE_COLORS[tag.type as TagType],
                  }}
                >
                  <select
                    value={tag.type}
                    onChange={(e) => void handleTypeChange(tag._id, e.target.value as TagType)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      fontSize: "inherit",
                      fontWeight: "inherit",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {TAG_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </span>

                {/* Color swatch */}
                <div
                  className="tag-color-swatch"
                  style={{ backgroundColor: tag.color || "#8b949e" }}
                >
                  <input
                    type="color"
                    value={tag.color || "#8b949e"}
                    onChange={(e) => void handleColorChange(tag._id, e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="tag-description">
                  {editingField?.id === tag._id && editingField.field === "description" ? (
                    <AutoFocusInput
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => void commitEdit()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitEdit();
                        if (e.key === "Escape") setEditingField(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(tag._id, "description", tag.description || "")}
                      style={{
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                        font: "inherit",
                        textAlign: "left",
                      }}
                    >
                      {tag.description || "Add description..."}
                    </button>
                  )}
                </div>

                {/* Time rule summary */}
                <div className="tag-time-rule">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTimeRule(expandedTimeRule === tag._id ? null : tag._id)
                    }
                    style={{
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "inherit",
                      font: "inherit",
                    }}
                  >
                    {tag.timeRule?.hours
                      ? `${formatHour(tag.timeRule.hours[0])} - ${formatHour(tag.timeRule.hours[1])}`
                      : "No schedule"}
                    {tag.timeRule?.days && tag.timeRule.days.length > 0
                      ? ` (${tag.timeRule.days.join(", ")})`
                      : ""}
                  </button>
                </div>

                {/* Usage count */}
                <TagUsageCount name={tag.name} />

                {/* Actions */}
                <div className="tag-actions">
                  <button
                    type="button"
                    onClick={() => void handleArchiveToggle(tag._id, tag.archived)}
                    title={tag.archived ? "Restore" : "Archive"}
                  >
                    {tag.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => void handleDelete(tag._id)}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Time rule editor (expanded) */}
                {expandedTimeRule === tag._id && (
                  <div className="time-rule-editor" style={{ flexBasis: "100%" }}>
                    <div className="hours-row">
                      <span>Hours:</span>
                      <input
                        type="time"
                        value={tag.timeRule?.hours ? formatHour(tag.timeRule.hours[0]) : "09:00"}
                        onChange={(e) =>
                          void handleTimeRuleHours(
                            tag._id,
                            tag.timeRule ?? undefined,
                            parseHourStr(e.target.value),
                            tag.timeRule?.hours?.[1] ?? 17,
                          )
                        }
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={tag.timeRule?.hours ? formatHour(tag.timeRule.hours[1]) : "17:00"}
                        onChange={(e) =>
                          void handleTimeRuleHours(
                            tag._id,
                            tag.timeRule ?? undefined,
                            tag.timeRule?.hours?.[0] ?? 9,
                            parseHourStr(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="days-row">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={`day-toggle${(tag.timeRule?.days || []).includes(day) ? " active" : ""}`}
                          onClick={() =>
                            void handleTimeRuleDays(tag._id, tag.timeRule ?? undefined, day)
                          }
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {filteredTags.length === 0 && (
        <div className="empty-state">
          <p>No tags found</p>
          {filter && <p>Try a different search term</p>}
        </div>
      )}
    </div>
  );
}
