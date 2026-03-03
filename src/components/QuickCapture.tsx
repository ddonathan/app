import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";

export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const createTask = useMutation(api.tasks.create);

  useEffect(() => {
    if (open && titleRef.current) {
      titleRef.current.focus();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    await createTask({
      title: title.trim(),
      status: "inbox",
      tags: tags.length > 0 ? tags : undefined,
    });

    setTitle("");
    setTagsStr("");
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="quick-capture-btn" onClick={() => setOpen(true)}>
        <Plus size={24} />
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
          <form className="quick-capture-form" onSubmit={handleSubmit}>
            <h3>Quick Capture</h3>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
            />
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="Tags (comma-separated)..."
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit">Create</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
