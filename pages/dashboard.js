import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatCard({ label, value, hint }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
      {hint ? <div style={styles.cardHint}>{hint}</div> : null}
    </div>
  );
}

function TrendChart({ title, seriesA, seriesB, colorA, colorB, labelA, labelB }) {
  const width = 900;
  const height = 220;
  const paddingX = 24;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxValue = Math.max(1, ...seriesA.map((point) => point.value), ...seriesB.map((point) => point.value));

  function getPoints(series) {
    if (series.length === 1) {
      return `${paddingX},${height / 2}`;
    }
    return series
      .map((point, index) => {
        const x = paddingX + (index / (series.length - 1)) * chartWidth;
        const y = paddingY + chartHeight - (point.value / maxValue) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");
  }

  const pointsA = getPoints(seriesA);
  const pointsB = getPoints(seriesB);
  const xLabels = seriesA.filter((_, index) => index % 5 === 0 || index === seriesA.length - 1);

  return (
    <section style={styles.chartCard}>
      <div style={styles.chartHead}>
        <h2 style={styles.chartTitle}>{title}</h2>
        <div style={styles.legendRow}>
          <span style={{ ...styles.legendItem, color: colorA }}>
            <span style={{ ...styles.legendDot, background: colorA }} />
            {labelA}
          </span>
          <span style={{ ...styles.legendItem, color: colorB }}>
            <span style={{ ...styles.legendDot, background: colorB }} />
            {labelB}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={styles.chartSvg} role="img" aria-label={title}>
        {[0, 1, 2, 3, 4].map((step) => {
          const y = paddingY + (step / 4) * chartHeight;
          return <line key={step} x1={paddingX} y1={y} x2={width - paddingX} y2={y} style={styles.gridLine} />;
        })}
        <polyline fill="none" stroke={colorA} strokeWidth="3" points={pointsA} strokeLinecap="round" />
        <polyline fill="none" stroke={colorB} strokeWidth="3" points={pointsB} strokeLinecap="round" />
      </svg>
      <div style={styles.xAxisLabels}>
        {xLabels.map((point) => (
          <span key={point.date} style={styles.xAxisLabel}>
            {formatDayLabel(point.date)}
          </span>
        ))}
      </div>
    </section>
  );
}

function StageBars({ stageDistribution = {} }) {
  const entries = Object.entries(stageDistribution || {});
  const maxCount = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <section style={styles.stageCard}>
      <h2 style={styles.stageTitle}>Stage Distribution</h2>
      <div style={styles.stageList}>
        {entries.map(([stage, count]) => (
          <div key={stage} style={styles.stageRow}>
            <div style={styles.stageRowTop}>
              <span style={styles.stageName}>{stage}</span>
              <span style={styles.stageCount}>{count}</span>
            </div>
            <div style={styles.stageBarTrack}>
              <div
                style={{
                  ...styles.stageBarFill,
                  width: `${(count / maxCount) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    lockedCompanies: 0,
    overdueTasks: 0,
    signingReadyCount: 0,
    stageDistribution: {},
    processingTimeline: [],
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/audit-dashboard");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Could not load dashboard.");
        }
        setStats(data);
      } catch (dashboardError) {
        setError(dashboardError.message || "Could not load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const timeline = stats.processingTimeline || [];
  const trendMoves = useMemo(
    () => timeline.map((item) => ({ date: item.date, value: item.processedTotal || 0 })),
    [timeline]
  );
  const trendSigning = useMemo(
    () => timeline.map((item) => ({ date: item.date, value: item.sentToSigning || 0 })),
    [timeline]
  );
  const trendReviewOnly = useMemo(
    () => timeline.map((item) => ({ date: item.date, value: item.stageMoves || 0 })),
    [timeline]
  );
  const timelineTotal = timeline.reduce((sum, item) => sum + (item.processedTotal || 0), 0);
  const signingTotal = timeline.reduce((sum, item) => sum + (item.sentToSigning || 0), 0);

  return (
    <>
      <Head>
        <title>Audit Dashboard</title>
        <meta name="description" content="Audit KPI dashboard" />
      </Head>

      <main>
        <div style={styles.topRow}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: ".3rem" }}>Dashboard</h1>
            <p style={{ marginTop: 0, color: "#4b5563" }}>
              KPI snapshot and timeline view of audit throughput.
            </p>
          </div>
          <Link href="/" style={styles.backLink}>
            Back to Companies
          </Link>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading dashboard...</div>
        ) : (
          <>
            <div style={styles.grid}>
              <StatCard label="Locked companies" value={stats.lockedCompanies} hint="Currently claimed" />
              <StatCard label="Overdue tasks" value={stats.overdueTasks} hint="Open tasks past due date" />
              <StatCard label="Signing-ready count" value={stats.signingReadyCount} hint="Ready in partner review" />
              <StatCard
                label="Stages tracked"
                value={Object.keys(stats.stageDistribution || {}).length}
                hint="Unique stage states"
              />
            </div>

            <div style={styles.gridTwo}>
              <TrendChart
                title="Companies Processed by Date (Last 30 days)"
                seriesA={trendMoves}
                seriesB={trendSigning}
                colorA="#1d4ed8"
                colorB="#047857"
                labelA={`All stage moves (${timelineTotal})`}
                labelB={`Sent to signing (${signingTotal})`}
              />
              <TrendChart
                title="Review Progress vs Signing"
                seriesA={trendReviewOnly}
                seriesB={trendSigning}
                colorA="#7c3aed"
                colorB="#0f766e"
                labelA="Review stage moves"
                labelB="Signing moves"
              />
            </div>

            <StageBars stageDistribution={stats.stageDistribution} />
          </>
        )}
      </main>
    </>
  );
}

const styles = {
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  backLink: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 13,
    borderRadius: 10,
    padding: ".5rem .75rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: ".8rem",
    marginBottom: "1rem",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: ".85rem",
    marginBottom: "1rem",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: ".85rem .9rem",
    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
  },
  cardLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: ".02em",
    color: "#6b7280",
    fontWeight: 700,
  },
  cardValue: {
    marginTop: ".35rem",
    fontSize: 26,
    fontWeight: 700,
    color: "#111827",
  },
  cardHint: {
    marginTop: ".3rem",
    fontSize: 12,
    color: "#6b7280",
  },
  chartCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    background: "#fff",
    padding: ".8rem .9rem",
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.05)",
  },
  chartHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: ".75rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  chartTitle: {
    margin: 0,
    fontSize: 16,
    color: "#0f172a",
  },
  legendRow: {
    display: "inline-flex",
    gap: ".75rem",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: ".3rem",
    fontSize: 12,
    fontWeight: 700,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
  },
  chartSvg: {
    width: "100%",
    marginTop: ".65rem",
    background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
    borderRadius: 10,
    border: "1px solid #eef2f7",
  },
  gridLine: {
    stroke: "#e2e8f0",
    strokeWidth: 1,
  },
  xAxisLabels: {
    marginTop: ".5rem",
    display: "flex",
    justifyContent: "space-between",
    gap: ".35rem",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 600,
  },
  xAxisLabel: {
    minWidth: 40,
  },
  stageCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: ".85rem .9rem",
    boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
  },
  stageTitle: {
    margin: 0,
    fontSize: 16,
    color: "#0f172a",
  },
  stageList: {
    marginTop: ".75rem",
    display: "grid",
    gap: ".55rem",
  },
  stageRow: {
    border: "1px solid #edf2f7",
    borderRadius: 10,
    background: "#fafcff",
    padding: ".5rem .6rem",
  },
  stageRowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: ".6rem",
  },
  stageName: {
    fontSize: 14,
    color: "#111827",
  },
  stageCount: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1f2937",
  },
  stageBarTrack: {
    marginTop: ".42rem",
    width: "100%",
    height: 7,
    borderRadius: 999,
    background: "#e2e8f0",
    overflow: "hidden",
  },
  stageBarFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
  },
  loading: {
    fontSize: 14,
    color: "#4b5563",
  },
  error: {
    padding: ".75rem .9rem",
    marginBottom: "1rem",
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 10,
    fontSize: 13,
  },
};
