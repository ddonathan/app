import { useEffect, useRef } from "react";

interface MenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => onClose();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // Adjust position if menu would overflow viewport
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      ref.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
      ref.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "4px 0",
        minWidth: 180,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <div key={item.label}>
          {item.divider && (
            <div
              style={{
                height: 1,
                background: "var(--border)",
                margin: "4px 0",
              }}
            />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              item.onClick();
            }}
            style={{
              width: "100%",
              padding: "8px 14px",
              background: "none",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "left",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "var(--border)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "none";
            }}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
