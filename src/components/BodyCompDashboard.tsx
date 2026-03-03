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
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { api } from "../../convex/_generated/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const BASELINE = { weight: 203.9, bf: 25.7, date: "2026-01-02" };
const GOAL_BF = 14;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function changeColor(value: number | undefined, invertBetter = false): string {
  if (value === undefined) return "#71717a";
  // For weight and bf, negative is good (losing). invertBetter flips this.
  const isGood = invertBetter ? value > 0 : value < 0;
  return isGood ? "#22c55e" : value === 0 ? "#71717a" : "#ef4444";
}

function formatChange(value: number | undefined, unit = ""): string {
  if (value === undefined) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${unit}`;
}

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
  statChange: (color: string) =>
    ({
      fontSize: 13,
      color,
      marginTop: 2,
      fontWeight: 600,
    }) as React.CSSProperties,
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
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  } as React.CSSProperties,
  chartCard: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: 16,
  } as React.CSSProperties,
  chartLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e4e4e7",
    marginBottom: 8,
  } as React.CSSProperties,
  chartWrap: {
    height: 220,
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 14,
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    color: "#71717a",
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: "1px solid #2a2d3a",
  } as React.CSSProperties,
  td: {
    padding: "8px 12px",
    color: "#e4e4e7",
    borderBottom: "1px solid #2a2d3a",
  } as React.CSSProperties,
  progressBarBg: {
    height: 24,
    borderRadius: 12,
    background: "#2a2d3a",
    overflow: "hidden",
    position: "relative" as const,
  } as React.CSSProperties,
  progressBarFill: (pct: number) =>
    ({
      height: "100%",
      borderRadius: 12,
      background: "linear-gradient(90deg, #22c55e, #22d3ee)",
      width: `${Math.min(Math.max(pct, 0), 100)}%`,
      transition: "width 0.4s ease",
    }) as React.CSSProperties,
  goalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as React.CSSProperties,
  goalCurrent: {
    fontSize: 14,
    color: "#e4e4e7",
    fontWeight: 600,
  } as React.CSSProperties,
  goalTarget: {
    fontSize: 13,
    color: "#71717a",
  } as React.CSSProperties,
  goalProjected: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 8,
  } as React.CSSProperties,
  photoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  } as React.CSSProperties,
  photoCard: {
    borderRadius: 8,
    overflow: "hidden",
    background: "#0f1117",
    border: "1px solid #2a2d3a",
  } as React.CSSProperties,
  photoImg: {
    width: "100%",
    height: 200,
    objectFit: "cover" as const,
    display: "block",
  } as React.CSSProperties,
  photoCaption: {
    padding: "6px 10px",
    fontSize: 12,
    color: "#71717a",
    textAlign: "center" as const,
  } as React.CSSProperties,
  formToggle: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 24,
    marginBottom: 8,
  } as React.CSSProperties,
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  } as React.CSSProperties,
  formLabel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    fontSize: 13,
    color: "#71717a",
  } as React.CSSProperties,
  formInput: {
    background: "#0f1117",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e4e4e7",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,
  formTextarea: {
    background: "#0f1117",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e4e4e7",
    fontSize: 14,
    outline: "none",
    minHeight: 60,
    resize: "vertical" as const,
    fontFamily: "inherit",
  } as React.CSSProperties,
  submitBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
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

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          const unit =
            ctx.dataset.label === "Goal" ? "%" : ctx.dataset.label === "Body Fat %" ? "%" : " lbs";
          return `${ctx.parsed.y ?? 0}${unit}`;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#71717a", maxTicksLimit: 8, font: { size: 11 } },
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

const weightChartOptions = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} lbs`,
      },
    },
  },
  scales: {
    ...baseChartOptions.scales,
    y: {
      ...baseChartOptions.scales.y,
      ticks: {
        ...baseChartOptions.scales.y.ticks,
        callback: (v: string | number) => v + " lbs",
      },
    },
  },
};

const bfChartOptions = {
  ...baseChartOptions,
  plugins: {
    ...baseChartOptions.plugins,
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
          if (ctx.dataset.label === "Goal") return `Goal: ${ctx.parsed.y ?? 0}%`;
          return `${ctx.parsed.y ?? 0}%`;
        },
      },
    },
  },
  scales: {
    ...baseChartOptions.scales,
    y: {
      ...baseChartOptions.scales.y,
      ticks: {
        ...baseChartOptions.scales.y.ticks,
        callback: (v: string | number) => v + "%",
      },
    },
  },
};

export default function BodyCompDashboard() {
  const stats = useQuery(api.bodycomp.stats);
  const entries = useQuery(api.bodycomp.list, {});
  const recentEntries = useQuery(api.bodycomp.recent, { n: 10 });
  const createEntry = useMutation(api.bodycomp.create);

  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(todayStr());
  const [formWeight, setFormWeight] = useState("");
  const [formBf, setFormBf] = useState("");
  const [formSmm, setFormSmm] = useState("");
  const [formLbm, setFormLbm] = useState("");
  const [formBfm, setFormBfm] = useState("");
  const [formBmi, setFormBmi] = useState("");
  const [formScore, setFormScore] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const optNum = (v: string) => {
        const n = Number.parseFloat(v);
        return Number.isNaN(n) ? undefined : n;
      };
      await createEntry({
        date: formDate,
        weight: optNum(formWeight),
        bf: optNum(formBf),
        smm: optNum(formSmm),
        lbm: optNum(formLbm),
        bfm: optNum(formBfm),
        bmi: optNum(formBmi),
        score: optNum(formScore),
        notes: formNotes || undefined,
      });
      setFormWeight("");
      setFormBf("");
      setFormSmm("");
      setFormLbm("");
      setFormBfm("");
      setFormBmi("");
      setFormScore("");
      setFormNotes("");
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Chart data
  const weightChartData = useMemo(() => {
    if (!entries) return null;
    const sorted = [...entries]
      .filter((e) => e.weight != null)
      .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    return {
      labels: sorted.map((e) => formatDate(e.date)),
      datasets: [
        {
          label: "Weight",
          data: sorted.map((e) => e.weight as number),
          borderColor: "#6366f1",
          backgroundColor: "#6366f120",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#6366f1",
          borderWidth: 2,
        },
      ],
    };
  }, [entries]);

  const bfChartData = useMemo(() => {
    if (!entries) return null;
    const sorted = [...entries]
      .filter((e) => e.bf != null)
      .sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    const labels = sorted.map((e) => formatDate(e.date));
    return {
      labels,
      datasets: [
        {
          label: "Body Fat %",
          data: sorted.map((e) => e.bf as number),
          borderColor: "#22c55e",
          backgroundColor: "#22c55e20",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: "#22c55e",
          borderWidth: 2,
        },
        {
          label: "Goal",
          data: Array(labels.length).fill(GOAL_BF) as number[],
          borderColor: "#22c55e40",
          borderWidth: 1,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [entries]);

  // Photo entries
  const photoEntries = useMemo(() => {
    if (!entries) return [];
    return entries
      .filter((e) => e.photos && e.photos.length > 0)
      .flatMap((e) =>
        (e.photos ?? []).map((photo) => ({
          date: e.date,
          photo,
        })),
      );
  }, [entries]);

  // Goal progress
  const goalProgress = useMemo(() => {
    if (!stats?.current?.bf) return 0;
    const startBf = BASELINE.bf;
    const currentBf = stats.current.bf;
    const totalNeeded = startBf - GOAL_BF;
    const achieved = startBf - currentBf;
    if (totalNeeded <= 0) return 0;
    return (achieved / totalNeeded) * 100;
  }, [stats]);

  // Lean mass calculation
  const leanMass = useMemo(() => {
    if (!stats?.current) return undefined;
    if (stats.current.lbm != null) return stats.current.lbm;
    if (stats.current.weight != null && stats.current.bf != null) {
      return stats.current.weight * (1 - stats.current.bf / 100);
    }
    return undefined;
  }, [stats]);

  if (!stats || !entries || !recentEntries) {
    return (
      <div style={styles.loadingWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Stats cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {stats.current.weight != null ? `${stats.current.weight.toFixed(1)}` : "--"}
          </div>
          <div style={styles.statLabel}>Weight (lbs)</div>
          <div style={styles.statChange(changeColor(stats.change.weight))}>
            {formatChange(stats.change.weight, " lbs")}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>
            {stats.current.bf != null ? `${stats.current.bf.toFixed(1)}%` : "--"}
          </div>
          <div style={styles.statLabel}>Body Fat %</div>
          <div style={styles.statChange(changeColor(stats.change.bf))}>
            {formatChange(stats.change.bf, "%")}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{leanMass != null ? `${leanMass.toFixed(1)}` : "--"}</div>
          <div style={styles.statLabel}>Lean Mass (lbs)</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.daysTracked}</div>
          <div style={styles.statLabel}>Days Tracked</div>
        </div>
      </div>

      {/* Goal Progress */}
      <div style={styles.sectionTitle}>Goal Progress</div>
      <div style={styles.card}>
        <div style={styles.goalRow}>
          <span style={styles.goalCurrent}>
            {stats.current.bf != null ? `${stats.current.bf.toFixed(1)}%` : "--"} BF
          </span>
          <span style={styles.goalTarget}>Target: {GOAL_BF}%</span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={styles.progressBarFill(goalProgress)} />
        </div>
        {stats.projectedGoalDate && (
          <div style={styles.goalProjected}>
            Projected goal date: {formatDate(stats.projectedGoalDate)}
          </div>
        )}
      </div>

      {/* Charts */}
      <div style={styles.sectionTitle}>Trends</div>
      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.chartLabel}>Weight</div>
          <div style={styles.chartWrap}>
            {weightChartData && weightChartData.labels.length > 0 ? (
              <Line data={weightChartData} options={weightChartOptions} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#71717a",
                  fontSize: 13,
                }}
              >
                No data yet
              </div>
            )}
          </div>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartLabel}>Body Fat %</div>
          <div style={styles.chartWrap}>
            {bfChartData && bfChartData.labels.length > 0 ? (
              <Line data={bfChartData} options={bfChartOptions} />
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#71717a",
                  fontSize: 13,
                }}
              >
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div style={styles.sectionTitle}>Recent Entries</div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Weight</th>
              <th style={styles.th}>BF%</th>
              <th style={styles.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {recentEntries.map((e) => (
              <tr key={e._id}>
                <td style={styles.td}>{formatDate(e.date)}</td>
                <td style={styles.td}>{e.weight != null ? `${e.weight.toFixed(1)} lbs` : "--"}</td>
                <td style={styles.td}>{e.bf != null ? `${e.bf.toFixed(1)}%` : "--"}</td>
                <td
                  style={{
                    ...styles.td,
                    color: "#71717a",
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.notes || "--"}
                </td>
              </tr>
            ))}
            {recentEntries.length === 0 && (
              <tr>
                <td style={{ ...styles.td, color: "#71717a", textAlign: "center" }} colSpan={4}>
                  No entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Photo Gallery */}
      {photoEntries.length > 0 && (
        <>
          <div style={styles.sectionTitle}>Progress Photos</div>
          <div style={styles.photoGrid}>
            {photoEntries.map(({ date, photo }) => (
              <div key={`${date}-${photo}`} style={styles.photoCard}>
                <img src={`/${photo}`} alt={`Progress ${date}`} style={styles.photoImg} />
                <div style={styles.photoCaption}>{formatDate(date)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Quick Log Form */}
      <button type="button" style={styles.formToggle} onClick={() => setFormOpen(!formOpen)}>
        {formOpen ? "Cancel" : "+ Log Entry"}
      </button>

      {formOpen && (
        <div style={styles.card}>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={styles.formGrid}>
              <label style={styles.formLabel}>
                Date
                <input
                  type="date"
                  style={styles.formInput}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
              <label style={styles.formLabel}>
                Weight (lbs)
                <input
                  type="number"
                  style={styles.formInput}
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  placeholder="e.g. 195"
                  step="0.1"
                />
              </label>
              <label style={styles.formLabel}>
                Body Fat %
                <input
                  type="number"
                  style={styles.formInput}
                  value={formBf}
                  onChange={(e) => setFormBf(e.target.value)}
                  placeholder="e.g. 22.5"
                  step="0.1"
                />
              </label>
              <label style={styles.formLabel}>
                SMM
                <input
                  type="number"
                  style={styles.formInput}
                  value={formSmm}
                  onChange={(e) => setFormSmm(e.target.value)}
                  step="0.1"
                />
              </label>
              <label style={styles.formLabel}>
                LBM
                <input
                  type="number"
                  style={styles.formInput}
                  value={formLbm}
                  onChange={(e) => setFormLbm(e.target.value)}
                  step="0.1"
                />
              </label>
              <label style={styles.formLabel}>
                BFM
                <input
                  type="number"
                  style={styles.formInput}
                  value={formBfm}
                  onChange={(e) => setFormBfm(e.target.value)}
                  step="0.1"
                />
              </label>
              <label style={styles.formLabel}>
                BMI
                <input
                  type="number"
                  style={styles.formInput}
                  value={formBmi}
                  onChange={(e) => setFormBmi(e.target.value)}
                  step="0.1"
                />
              </label>
              <label style={styles.formLabel}>
                Score
                <input
                  type="number"
                  style={styles.formInput}
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  step="0.1"
                />
              </label>
            </div>
            <label style={{ ...styles.formLabel, marginBottom: 16 }}>
              Notes
              <textarea
                style={styles.formTextarea}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </label>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? "Saving..." : "Log Entry"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
