import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

type Page = "tasks" | "tags" | "fitness" | "bodycomp" | "bloodlabs";

export default function NavMenu({
  activePage,
  onNavigate,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const menuItems = [
    { id: "tasks" as Page, label: "Tasks", icon: "\u{1F4CB}", enabled: true },
    { id: "tags" as Page, label: "Tags", icon: "\u{1F3F7}\uFE0F", enabled: true },
    { id: "fitness" as Page, label: "Big Four No Dread", icon: "\u{1F3CB}\uFE0F", enabled: true },
    { id: "bodycomp" as Page, label: "Body Composition", icon: "\u{1F4CA}", enabled: true },
    { id: "bloodlabs" as Page, label: "Blood Labs", icon: "\u{1FA78}", enabled: true },
    { id: "contacts", label: "Contacts", icon: "\u{1F465}", enabled: false },
  ];

  return (
    <>
      <button type="button" className="nav-menu-toggle" onClick={() => setOpen(!open)} title="Menu">
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <button
          type="button"
          className="nav-menu-overlay"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      )}

      <nav className={`nav-menu${open ? " open" : ""}`}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-menu-item${activePage === item.id ? " active" : ""}${!item.enabled ? " disabled" : ""}`}
            disabled={!item.enabled}
            onClick={() => {
              if (item.enabled) {
                onNavigate(item.id as Page);
                setOpen(false);
              }
            }}
          >
            <span className="nav-menu-icon">{item.icon}</span>
            <span>{item.label}</span>
            {!item.enabled && <span className="nav-menu-soon">Soon</span>}
          </button>
        ))}
      </nav>
    </>
  );
}
