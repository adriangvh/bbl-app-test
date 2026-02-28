import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const COMPANIES_POLL_MS = 5000;

function formatLock(lock) {
  if (!lock) {
    return "Unlocked";
  }
  return `Locked by ${lock.actorName}`;
}

export default function Home() {
  const [companies, setCompanies] = useState([]);
  const [groupFilter, setGroupFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorName, setActorName] = useState("");
  const [busyCompanyId, setBusyCompanyId] = useState("");

  async function loadCompanies(options = {}) {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
    }
    setError("");
    try {
      const response = await fetch("/api/audit-companies");
      if (!response.ok) {
        throw new Error("Could not load companies.");
      }
      const data = await response.json();
      setCompanies(data.companies || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load companies.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const existingActorId = window.localStorage.getItem("auditActorId");
    const existingActorName = window.localStorage.getItem("auditActorName");
    const nextActorId =
      existingActorId ||
      (window.crypto?.randomUUID ? window.crypto.randomUUID() : `actor-${Date.now()}`);
    if (!existingActorId) {
      window.localStorage.setItem("auditActorId", nextActorId);
    }
    setActorId(nextActorId);
    if (existingActorName) {
      setActorName(existingActorName);
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!actorName || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("auditActorName", actorName);
  }, [actorName]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      loadCompanies({ silent: true });
    }, COMPANIES_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  async function updateLock(companyId, action) {
    if (!actorId) {
      return;
    }
    setBusyCompanyId(companyId);
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          companyId,
          actorId,
          actorName,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not update lock.");
      }
      setCompanies((prevCompanies) =>
        prevCompanies.map((company) =>
          company.id === companyId ? { ...company, lock: data.lock || null } : company
        )
      );
    } catch (lockError) {
      setError(lockError.message || "Could not update lock.");
    } finally {
      setBusyCompanyId("");
    }
  }

  const groupOptions = Array.from(new Set(companies.map((company) => company.group))).sort();
  const stageOptions = Array.from(
    new Set(companies.map((company) => company.auditStage).filter(Boolean))
  );
  const filteredCompanies = companies.filter((company) =>
    (groupFilter === "all" ? true : company.group === groupFilter) &&
    (stageFilter === "all" ? true : company.auditStage === stageFilter)
  );

  return (
    <>
      <Head>
        <title>Audit Companies</title>
        <meta name="description" content="Company audit lock and delegation board" />
      </Head>

      <main>
        <h1 style={{ marginTop: 0 }}>Audit Companies</h1>
        <p style={{ color: "#4b5563", marginTop: ".35rem" }}>
          Claim a company lock here, then open its audit task board.
        </p>

        <div style={styles.headerRow}>
          <input
            style={styles.nameInput}
            placeholder="Your name"
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
          />
          <select
            style={styles.filterSelect}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">All groups</option>
            {groupOptions.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <select
            style={styles.filterSelect}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All stages</option>
            {stageOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Organization no.</th>
                <th style={styles.th}>Group</th>
                <th style={styles.th}>Stage</th>
                <th style={styles.th}>Tasks</th>
                <th style={styles.th}>Lock status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.td} colSpan={7}>
                    Loading companies...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={7}>
                    No companies in this group.
                  </td>
                </tr>
              ) : filteredCompanies.map((company) => {
                const holdsLock = Boolean(company.lock && company.lock.actorId === actorId);
                const lockedByOther = Boolean(company.lock && company.lock.actorId !== actorId);
                const canClaim = actorName.trim().length >= 2 && !lockedByOther;

                return (
                  <tr key={company.id}>
                    <td style={styles.tdStrong}>{company.name}</td>
                    <td style={styles.tdMono}>{company.organizationNumber}</td>
                    <td style={styles.td}>{company.group}</td>
                    <td style={styles.td}>{company.auditStage || "-"}</td>
                    <td style={styles.td}>{company.taskCount}</td>
                    <td style={styles.tdLock}>
                      <span style={styles.lockStatusSlot}>
                        {formatLock(company.lock)}
                      </span>
                    </td>
                    <td style={styles.tdActions}>
                      <div style={styles.actions}>
                        <button
                          style={styles.lockButton}
                          disabled={
                            busyCompanyId === company.id ||
                            (holdsLock ? false : !canClaim)
                          }
                          onClick={() =>
                            updateLock(company.id, holdsLock ? "release" : "claim")
                          }
                        >
                          {holdsLock ? "Release lock" : "Claim lock"}
                        </button>
                        <Link
                          href={{
                            pathname: "/audit-tasks",
                            query: { companyId: company.id, companyName: company.name },
                          }}
                          style={styles.openLink}
                        >
                          Open audit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

const styles = {
  headerRow: {
    marginTop: ".8rem",
    marginBottom: "1rem",
    display: "flex",
    gap: ".65rem",
    flexWrap: "wrap",
    alignItems: "center",
  },
  nameInput: {
    padding: ".55rem .7rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    minWidth: 200,
    outline: "none",
  },
  filterSelect: {
    padding: ".55rem .7rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    minWidth: 170,
    outline: "none",
    background: "#fff",
  },
  tableWrap: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    tableLayout: "fixed",
  },
  th: {
    textAlign: "left",
    padding: ".75rem .9rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#fafafa",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: ".02em",
    color: "#6b7280",
    whiteSpace: "nowrap",
  },
  td: {
    padding: ".8rem .9rem",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "top",
  },
  tdStrong: {
    padding: ".8rem .9rem",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    color: "#111827",
    fontWeight: 700,
    verticalAlign: "top",
    whiteSpace: "nowrap",
  },
  tdMono: {
    padding: ".8rem .9rem",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 13,
    color: "#111827",
    verticalAlign: "top",
    whiteSpace: "nowrap",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  tdLock: {
    padding: ".8rem .9rem",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "top",
    width: 220,
  },
  lockStatusSlot: {
    display: "inline-block",
    width: 200,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tdActions: {
    padding: ".8rem .9rem",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "top",
    minWidth: 230,
  },
  actions: {
    display: "flex",
    gap: ".55rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  lockButton: {
    padding: ".45rem .75rem",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
    minWidth: 98,
  },
  openLink: {
    padding: ".45rem .75rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    color: "#111827",
    textDecoration: "none",
    background: "#fff",
    fontSize: 13,
    fontWeight: 600,
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
