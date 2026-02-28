import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

function StatCard({ label, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
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
              KPI snapshot for audit operations.
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
              <StatCard label="Locked companies" value={stats.lockedCompanies} />
              <StatCard label="Overdue tasks" value={stats.overdueTasks} />
              <StatCard label="Signing-ready count" value={stats.signingReadyCount} />
              <StatCard
                label="Stages tracked"
                value={Object.keys(stats.stageDistribution || {}).length}
              />
            </div>

            <section style={styles.stageCard}>
              <h2 style={styles.stageTitle}>Stage Distribution</h2>
              <div style={styles.stageList}>
                {Object.entries(stats.stageDistribution || {}).map(([stage, count]) => (
                  <div key={stage} style={styles.stageRow}>
                    <span style={styles.stageName}>{stage}</span>
                    <span style={styles.stageCount}>{count}</span>
                  </div>
                ))}
              </div>
            </section>
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
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: ".8rem .9rem",
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
  stageCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    padding: ".8rem .9rem",
  },
  stageTitle: {
    margin: 0,
    fontSize: 16,
    color: "#111827",
  },
  stageList: {
    marginTop: ".75rem",
    display: "grid",
    gap: ".45rem",
  },
  stageRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #f1f5f9",
    borderRadius: 10,
    background: "#fafafa",
    padding: ".5rem .6rem",
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
