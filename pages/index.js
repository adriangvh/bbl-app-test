import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

const COMPANIES_POLL_MS = 5000;
const AUDIT_STAGES = [
  "First time auditing",
  "First time review",
  "Second time review",
  "Partner review",
  "Signing",
];

function getStageChipStyle(stage) {
  const palette = {
    "First time auditing": {
      background: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    "First time review": {
      background: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
    },
    "Second time review": {
      background: "#ecfeff",
      border: "#a5f3fc",
      color: "#0f766e",
    },
    "Partner review": {
      background: "#f5f3ff",
      border: "#ddd6fe",
      color: "#6d28d9",
    },
    Signing: {
      background: "#ecfdf5",
      border: "#bbf7d0",
      color: "#166534",
    },
  };
  return palette[stage] || {
    background: "#f3f4f6",
    border: "#d1d5db",
    color: "#374151",
  };
}

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
  const [lockFilter, setLockFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorName, setActorName] = useState("");
  const [employeeType, setEmployeeType] = useState("auditor");
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
    const existingEmployeeType = window.localStorage.getItem("auditEmployeeType");
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
    if (existingEmployeeType) {
      setEmployeeType(existingEmployeeType);
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!actorName) {
      return;
    }
    window.localStorage.setItem("auditActorName", actorName);
  }, [actorName]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("auditEmployeeType", employeeType);
  }, [employeeType]);

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
          actorRole: employeeType,
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
  const stageOptions = AUDIT_STAGES.filter((stage) =>
    companies.some((company) => company.auditStage === stage)
  );
  const matchesLockFilter = (company) => {
    if (lockFilter === "all") {
      return true;
    }
    if (lockFilter === "locked") {
      return Boolean(company.lock);
    }
    if (lockFilter === "unlocked") {
      return !company.lock;
    }
    return true;
  };
  const filteredCompanies = companies.filter((company) =>
    (groupFilter === "all" ? true : company.group === groupFilter) &&
    (stageFilter === "all" ? true : company.auditStage === stageFilter) &&
    matchesLockFilter(company)
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

        <div style={styles.sessionRow}>
          <span style={styles.sessionLabel}>Auditor name</span>
          <input
            style={styles.nameInput}
            placeholder="Your name"
            value={actorName}
            onChange={(e) => setActorName(e.target.value)}
          />
          <div style={styles.employeeTypeField}>
            <span style={styles.sessionLabel}>Employee type</span>
            <select
              style={styles.employeeTypeSelect}
              value={employeeType}
              onChange={(e) => setEmployeeType(e.target.value)}
            >
              <option value="auditor">Auditor</option>
              <option value="manager">Manager</option>
              <option value="partner">Partner</option>
            </select>
          </div>
        </div>

        <div style={styles.headerRow}>
          <div style={styles.filterField}>
            <span style={styles.filterLabel}>Group</span>
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
          </div>
          <div style={styles.filterField}>
            <span style={styles.filterLabel}>Stage</span>
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
          <div style={styles.filterField}>
            <span style={styles.filterLabel}>Lock</span>
            <select
              style={styles.filterSelect}
              value={lockFilter}
              onChange={(e) => setLockFilter(e.target.value)}
            >
              <option value="all">All lock states</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>
          </div>
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
                const canClaim = actorName.trim().length >= 2 && !company.lock;
                const canForceRelease =
                  lockedByOther &&
                  (employeeType === "manager" || employeeType === "partner");
                const lockAction = holdsLock
                  ? "release"
                  : canForceRelease
                  ? "force_release"
                  : "claim";
                const lockLabel = holdsLock
                  ? "Release lock"
                  : canForceRelease
                  ? "Release other lock"
                  : "Claim lock";
                const disableLockButton = busyCompanyId === company.id || !canClaim;

                return (
                  <tr key={company.id}>
                    <td style={styles.tdStrong}>{company.name}</td>
                    <td style={styles.tdMono}>{company.organizationNumber}</td>
                    <td style={styles.td}>{company.group}</td>
                    <td style={styles.td}>
                      {company.auditStage ? (
                        <span
                          style={{
                            ...styles.stageChip,
                            ...getStageChipStyle(company.auditStage),
                          }}
                        >
                          {company.auditStage}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={styles.td}>{company.taskCount}</td>
                    <td style={styles.tdLock}>
                      <span style={styles.lockStatusSlot}>
                        {formatLock(company.lock)}
                      </span>
                    </td>
                    <td style={styles.tdActions}>
                      <div style={styles.actions}>
                        {(holdsLock || canForceRelease || !company.lock) && (
                          <button
                            style={{
                              ...styles.lockButton,
                              ...(canForceRelease ? styles.forceReleaseButton : {}),
                            }}
                            disabled={
                              holdsLock || canForceRelease ? busyCompanyId === company.id : disableLockButton
                            }
                            onClick={() => updateLock(company.id, lockAction)}
                          >
                            {lockLabel}
                          </button>
                        )}
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
  sessionRow: {
    marginTop: ".9rem",
    marginBottom: ".75rem",
    display: "flex",
    alignItems: "center",
    gap: ".65rem",
    flexWrap: "wrap",
  },
  employeeTypeField: {
    display: "flex",
    flexDirection: "column",
    gap: ".32rem",
  },
  employeeTypeSelect: {
    padding: ".56rem .75rem",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    minWidth: 180,
    outline: "none",
    background: "#fff",
    color: "#111827",
    fontWeight: 600,
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".02em",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  headerRow: {
    marginTop: ".2rem",
    marginBottom: "1rem",
    display: "flex",
    gap: ".85rem",
    flexWrap: "wrap",
    alignItems: "flex-end",
    padding: ".7rem .8rem",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fafafa",
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: ".32rem",
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".03em",
    textTransform: "uppercase",
    color: "#6b7280",
  },
  nameInput: {
    padding: ".56rem .75rem",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    minWidth: 220,
    outline: "none",
    background: "#fff",
    color: "#0f172a",
  },
  filterSelect: {
    padding: ".56rem .75rem",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    minWidth: 170,
    outline: "none",
    background: "#fff",
    color: "#111827",
    fontWeight: 600,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
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
  stageChip: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid",
    padding: ".22rem .58rem",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
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
  forceReleaseButton: {
    borderColor: "#f59e0b",
    background: "#fffbeb",
    color: "#92400e",
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
