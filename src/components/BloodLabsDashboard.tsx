import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { api } from "../../convex/_generated/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateFull(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseRefRange(refRange: string | undefined): { min: number; max: number } | null {
  if (!refRange) return null;
  const match = refRange.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (!match) return null;
  const min = Number.parseFloat(match[1]);
  const max = Number.parseFloat(match[2]);
  if (Number.isNaN(min) || Number.isNaN(max)) return null;
  return { min, max };
}

function isValueFlagged(value: number, refRange: string | undefined): boolean {
  const range = parseRefRange(refRange);
  if (!range) return false;
  return value < range.min || value > range.max;
}

type FilterMode = "all" | "flagged" | "recent";

const styles = {
  container: {
    padding: "16px 20px",
    maxWidth: 1200,
    margin: "0 auto",
  } as React.CSSProperties,
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 20,
  } as React.CSSProperties,
  statCard: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: "16px 20px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#e4e4e7",
    lineHeight: 1.2,
  } as React.CSSProperties,
  statLabel: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 4,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#e4e4e7",
    marginBottom: 12,
    marginTop: 24,
  } as React.CSSProperties,
  card: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: 16,
    marginTop: 16,
  } as React.CSSProperties,
  contentGridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    marginTop: 16,
  } as React.CSSProperties,
  sidebar: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
  } as React.CSSProperties,
  searchInput: {
    background: "#0f1117",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e4e4e7",
    fontSize: 14,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    marginBottom: 12,
  } as React.CSSProperties,
  filterRow: {
    display: "flex",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  filterBtn: (active: boolean) =>
    ({
      background: active ? "#6366f1" : "#0f1117",
      color: active ? "#fff" : "#71717a",
      border: active ? "1px solid #6366f1" : "1px solid #2a2d3a",
      borderRadius: 6,
      padding: "4px 10px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    }) as React.CSSProperties,
  markerList: {
    overflowY: "auto" as const,
    maxHeight: "calc(100vh - 250px)",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  } as React.CSSProperties,
  markerItem: (active: boolean) =>
    ({
      background: active ? "#1e2235" : "transparent",
      border: active ? "1px solid #6366f1" : "1px solid transparent",
      borderRadius: 8,
      padding: "10px 12px",
      cursor: "pointer",
      textAlign: "left" as const,
      color: "#e4e4e7",
      transition: "border-color 0.15s",
    }) as React.CSSProperties,
  markerName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#e4e4e7",
    marginBottom: 2,
  } as React.CSSProperties,
  markerMeta: {
    fontSize: 12,
    color: "#71717a",
  } as React.CSSProperties,
  markerValueFlagged: {
    color: "#ef4444",
    fontWeight: 600,
  } as React.CSSProperties,
  chartPanel: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column" as const,
  } as React.CSSProperties,
  chartHeader: {
    marginBottom: 16,
  } as React.CSSProperties,
  chartTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#e4e4e7",
    marginBottom: 4,
  } as React.CSSProperties,
  chartSubtitle: {
    fontSize: 13,
    color: "#71717a",
  } as React.CSSProperties,
  chartWrap: {
    height: 300,
    flexGrow: 1,
  } as React.CSSProperties,
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#71717a",
    fontSize: 14,
    minHeight: 200,
  } as React.CSSProperties,
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "50vh",
  } as React.CSSProperties,
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #2a2d3a",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  } as React.CSSProperties,
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          return `${ctx.dataset.label}: ${ctx.parsed.y ?? 0}`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#71717a", maxTicksLimit: 10, font: { size: 11 } },
      grid: { color: "rgba(42, 45, 58, 0.5)" },
    },
    y: {
      ticks: {
        color: "#71717a",
        font: { size: 11 },
      },
      grid: { color: "rgba(42, 45, 58, 0.5)" },
    },
  },
};

function MarkerChart({ markerName }: { markerName: string }) {
  const entries = useQuery(api.bloodlabs.byMarker, { markerName });

  const chartData = useMemo(() => {
    if (!entries || entries.length === 0) return null;

    const labels = entries.map((e) => formatDate(e.drawDate));
    const values = entries.map((e) => e.value);

    // Parse reference range from the first entry that has one
    const refEntry = entries.find((e) => e.referenceRange);
    const range = parseRefRange(refEntry?.referenceRange);

    const datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string | string[];
      fill: boolean | string | { target: string; above: string; below: string };
      tension: number;
      pointRadius: number | number[];
      pointBackgroundColor: string | string[];
      borderWidth: number;
      borderDash?: number[];
      order?: number;
    }> = [
      {
        label: markerName,
        data: values,
        borderColor: "#6366f1",
        backgroundColor: "#6366f120",
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: entries.map((e) => {
          if (isValueFlagged(e.value, e.referenceRange)) return "#ef4444";
          return "#6366f1";
        }),
        borderWidth: 2,
        order: 1,
      },
    ];

    if (range) {
      // Reference range upper bound (dashed line)
      datasets.push({
        label: "Ref Max",
        data: Array(labels.length).fill(range.max) as number[],
        borderColor: "#22c55e40",
        backgroundColor: "#22c55e08",
        borderWidth: 1,
        borderDash: [6, 4],
        pointRadius: 0,
        pointBackgroundColor: "transparent",
        fill: false,
        tension: 0,
        order: 2,
      });

      // Reference range lower bound (dashed line, fill up to max)
      datasets.push({
        label: "Ref Min",
        data: Array(labels.length).fill(range.min) as number[],
        borderColor: "#22c55e40",
        backgroundColor: "#22c55e08",
        borderWidth: 1,
        borderDash: [6, 4],
        pointRadius: 0,
        pointBackgroundColor: "transparent",
        fill: { target: "-1", above: "#22c55e10", below: "#22c55e10" },
        tension: 0,
        order: 3,
      });
    }

    return { labels, datasets };
  }, [entries, markerName]);

  const description = entries?.find((e) => e.markerDescription)?.markerDescription;
  const units = entries?.find((e) => e.units)?.units;
  const refRange = entries?.find((e) => e.referenceRange)?.referenceRange;

  if (!entries) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.chartPanel}>
      <div style={styles.chartHeader}>
        <div style={styles.chartTitle}>{markerName}</div>
        <div style={styles.chartSubtitle}>
          {[description, units && `Units: ${units}`, refRange && `Ref: ${refRange}`]
            .filter(Boolean)
            .join(" \u2022 ")}
        </div>
      </div>
      <div style={styles.chartWrap}>
        {chartData && chartData.labels.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div style={styles.emptyState}>No data for this marker</div>
        )}
      </div>
    </div>
  );
}

export default function BloodLabsDashboard() {
  const labStats = useQuery(api.bloodlabs.stats);
  const markers = useQuery(api.bloodlabs.markers);
  const allEntries = useQuery(api.bloodlabs.list, {});

  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  // Listen for resize
  useState(() => {
    if (typeof window === "undefined") return;
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  });

  // Build a lookup of latest referenceRange per marker for flagged filtering
  const markerRefRanges = useMemo(() => {
    if (!allEntries) return new Map<string, string>();
    const map = new Map<string, string>();
    // allEntries is sorted desc by drawDate from the API
    for (const entry of allEntries) {
      if (entry.referenceRange && !map.has(entry.markerName)) {
        map.set(entry.markerName, entry.referenceRange);
      }
    }
    return map;
  }, [allEntries]);

  const filteredMarkers = useMemo(() => {
    if (!markers) return [];
    let list = [...markers];

    // Text search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter((m) => m.markerName.toLowerCase().includes(q));
    }

    // Mode filter
    if (filterMode === "flagged") {
      list = list.filter((m) => {
        const ref = markerRefRanges.get(m.markerName);
        return isValueFlagged(m.value, ref);
      });
    } else if (filterMode === "recent") {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const cutoff = twoYearsAgo.toISOString().split("T")[0];
      list = list.filter((m) => m.drawDate >= cutoff);
    }

    return list;
  }, [markers, searchText, filterMode, markerRefRanges]);

  if (!labStats || !markers || !allEntries) {
    return (
      <div style={styles.loadingWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Summary cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{labStats.totalDraws}</div>
          <div style={styles.statLabel}>Total Draws</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{labStats.totalMarkers}</div>
          <div style={styles.statLabel}>Markers Tracked</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {labStats.dateRange.latest ? formatDateFull(labStats.dateRange.latest) : "--"}
          </div>
          <div style={styles.statLabel}>Last Draw</div>
        </div>
        <div style={styles.statCard}>
          <div
            style={{
              ...styles.statValue,
              color: labStats.flaggedCount > 0 ? "#ef4444" : "#e4e4e7",
            }}
          >
            {labStats.flaggedCount}
          </div>
          <div style={styles.statLabel}>Flagged Values</div>
        </div>
      </div>

      {/* Main content: sidebar + chart */}
      <div style={isMobile ? styles.contentGridMobile : styles.contentGrid}>
        {/* Marker list sidebar */}
        <div style={styles.sidebar}>
          <input
            type="text"
            placeholder="Search markers..."
            style={styles.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <div style={styles.filterRow}>
            <button
              type="button"
              style={styles.filterBtn(filterMode === "all")}
              onClick={() => setFilterMode("all")}
            >
              All
            </button>
            <button
              type="button"
              style={styles.filterBtn(filterMode === "flagged")}
              onClick={() => setFilterMode("flagged")}
            >
              Flagged Only
            </button>
            <button
              type="button"
              style={styles.filterBtn(filterMode === "recent")}
              onClick={() => setFilterMode("recent")}
            >
              Recent (2yr)
            </button>
          </div>

          <div style={styles.markerList}>
            {filteredMarkers.map((m) => {
              const ref = markerRefRanges.get(m.markerName);
              const flagged = isValueFlagged(m.value, ref);
              return (
                <button
                  type="button"
                  key={m.markerName}
                  style={styles.markerItem(selectedMarker === m.markerName)}
                  onClick={() => setSelectedMarker(m.markerName)}
                >
                  <div style={styles.markerName}>{m.markerName}</div>
                  <div style={styles.markerMeta}>
                    <span style={flagged ? styles.markerValueFlagged : undefined}>
                      {m.value} {m.units ?? ""}
                    </span>
                    {" \u2022 "}
                    {formatDate(m.drawDate)}
                  </div>
                </button>
              );
            })}
            {filteredMarkers.length === 0 && (
              <div
                style={{
                  color: "#71717a",
                  fontSize: 13,
                  padding: 12,
                  textAlign: "center" as const,
                }}
              >
                No markers found
              </div>
            )}
          </div>
        </div>

        {/* Chart panel */}
        {selectedMarker ? (
          <MarkerChart markerName={selectedMarker} />
        ) : (
          <div style={styles.chartPanel}>
            <div style={styles.emptyState}>Select a marker to view its trend</div>
          </div>
        )}
      </div>
    </div>
  );
}
