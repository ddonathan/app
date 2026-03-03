import { useMutation } from "convex/react";
import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

export default function BrainDump() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createTask = useMutation(api.tasks.create);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const handleAddAll = async () => {
    if (lines.length === 0) return;
    setCreating(true);
    try {
      for (const line of lines) {
        await createTask({ title: line, status: "inbox" });
      }
      setText("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button type="button" className="brain-dump-btn" onClick={() => setOpen(true)}>
        <Zap size={14} style={{ marginRight: 4, verticalAlign: -2 }} />
        Brain Dump
      </button>

      {open && (
        <div
          className="quick-capture-overlay"
          role="none"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        >
          <div className="brain-dump-form">
            <h3>Brain Dump</h3>
            <textarea
              ref={textareaRef}
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="One task per line..."
            />
            <div className="brain-dump-footer">
              <span className="brain-dump-count">
                {lines.length} {lines.length === 1 ? "task" : "tasks"} to create
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={lines.length === 0 || creating}
                  onClick={handleAddAll}
                >
                  {creating ? "Adding..." : "Add All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
