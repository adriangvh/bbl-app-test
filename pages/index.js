import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const COMPANIES_POLL_MS = 5000;
const AUDIT_STAGES = [
  "First time auditing",
  "First time review",
  "Second time review",
  "Partner review",
  "Signing",
];

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

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

function isOverdue(company) {
  return Boolean(
    company.taskDueDate &&
      company.taskDueDate < getTodayIso() &&
      company.auditStage !== "Signing"
  );
}

function isDueSoon(company) {
  if (!company.taskDueDate) {
    return false;
  }
  const today = new Date(`${getTodayIso()}T00:00:00`);
  const due = new Date(`${company.taskDueDate}T00:00:00`);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
}

export default function Home() {
  const [companies, setCompanies] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationBusyById, setNotificationBusyById] = useState({});
  const [groupFilter, setGroupFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [lockFilter, setLockFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorName, setActorName] = useState("");
  const [employeeType, setEmployeeType] = useState("auditor");
  const [busyCompanyId, setBusyCompanyId] = useState("");
  const [busyDueCompanyId, setBusyDueCompanyId] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);

  const canEditDueDate = employeeType === "manager" || employeeType === "partner";

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

  async function loadNotifications() {
    if (!actorName.trim()) {
      setNotifications([]);
      return;
    }
    try {
      const params = new URLSearchParams({ viewerName: actorName.trim() });
      const response = await fetch(`/api/audit-notifications?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not load notifications.");
      }
      setNotifications(data.notifications || []);
    } catch (notificationError) {
      setError(notificationError.message || "Could not load notifications.");
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
    if (existingActorName) {
      loadNotifications();
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!actorName) {
      setNotifications([]);
      return;
    }
    window.localStorage.setItem("auditActorName", actorName);
    loadNotifications();
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
      loadNotifications();
    }, COMPANIES_POLL_MS);
    return () => clearInterval(timer);
  }, []);

  async function markNotificationRead(notificationId) {
    if (!actorName.trim()) {
      return;
    }
    setNotificationBusyById((prev) => ({ ...prev, [notificationId]: true }));
    try {
      const response = await fetch("/api/audit-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          notificationId,
          viewerName: actorName.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not mark notification as read.");
      }
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== String(notificationId))
      );
    } catch (notificationError) {
      setError(notificationError.message || "Could not mark notification as read.");
    } finally {
      setNotificationBusyById((prev) => ({ ...prev, [notificationId]: false }));
    }
  }

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

  async function updateCompanyDueDate(companyId, dueDate) {
    if (!canEditDueDate) {
      return;
    }
    setBusyDueCompanyId(companyId);
    setError("");
    try {
      const response = await fetch("/api/audit-companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          dueDate: dueDate || null,
          actorRole: employeeType,
          actorId,
          actorName,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not update due date.");
      }
      if (data.company) {
        setCompanies((prevCompanies) =>
          prevCompanies.map((company) =>
            company.id === companyId ? { ...company, ...data.company } : company
          )
        );
      }
    } catch (dueError) {
      setError(dueError.message || "Could not update due date.");
    } finally {
      setBusyDueCompanyId("");
    }
  }

  const groupOptions = useMemo(
    () => Array.from(new Set(companies.map((company) => company.group))).sort(),
    [companies]
  );
  const stageOptions = useMemo(
    () => AUDIT_STAGES.filter((stage) => companies.some((company) => company.auditStage === stage)),
    [companies]
  );

  const filteredCompanies = companies.filter((company) => {
    const matchGroup = groupFilter === "all" ? true : company.group === groupFilter;
    const matchStage = stageFilter === "all" ? true : company.auditStage === stageFilter;
    const matchLock =
      lockFilter === "all"
        ? true
        : lockFilter === "locked"
        ? Boolean(company.lock)
        : !company.lock;
    const matchDue =
      dueFilter === "all"
        ? true
        : dueFilter === "overdue"
        ? isOverdue(company)
        : dueFilter === "due_soon"
        ? isDueSoon(company)
        : dueFilter === "has_due"
        ? Boolean(company.taskDueDate)
        : !company.taskDueDate;
    return matchGroup && matchStage && matchLock && matchDue;
  });

  return (
    <>
      <Head>
        <title>Audit Companies</title>
        <meta name="description" content="Company audit lock and delegation board" />
      </Head>

      <main>
        <div style={styles.pageTopRow}>
          <div>
            <h1 style={{ marginTop: 0, marginBottom: ".3rem" }}>Audit Companies</h1>
            <p style={{ color: "#4b5563", marginTop: 0 }}>
              Claim a company lock here, set due dates, and open the audit workspace.
            </p>
          </div>
          <div style={styles.topActions}>
            <button
              type="button"
              style={styles.bellButton}
              onClick={() => setShowAlerts((prev) => !prev)}
              aria-label="Toggle alerts"
            >
              <span style={styles.bellIcon}>🔔</span>
              {notifications.length > 0 && (
                <span style={styles.bellBadge}>+{notifications.length}</span>
              )}
            </button>
            <Link href="/dashboard" style={styles.dashboardLink}>
              Open Dashboard
            </Link>
          </div>
        </div>

        <div style={styles.sessionRow}>
          <span style={styles.sessionLabel}>Name</span>
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

        {showAlerts && (
          <section style={styles.notificationsWrap}>
            <div style={styles.notificationsHeader}>
              <span style={styles.notificationsTitle}>Alerts</span>
              <span style={styles.notificationsCount}>{notifications.length}</span>
            </div>
            {actorName.trim().length < 2 ? (
              <div style={styles.notificationsEmpty}>
                Enter your name to load your mention alerts.
              </div>
            ) : notifications.length === 0 ? (
              <div style={styles.notificationsEmpty}>No unread alerts.</div>
            ) : (
              <div style={styles.notificationsList}>
                {notifications.map((notification) => (
                  <div key={notification.id} style={styles.notificationItem}>
                    <div style={styles.notificationMessage}>{notification.message}</div>
                    <div style={styles.notificationMeta}>
                      <span>{notification.companyName}</span>
                      <span>•</span>
                      <span>From {notification.senderName}</span>
                    </div>
                    <div style={styles.notificationActions}>
                      <Link
                        href={{
                          pathname: "/audit-tasks",
                          query: {
                            companyId: notification.companyId,
                            companyName: notification.companyName,
                          },
                        }}
                        style={styles.notificationOpenLink}
                      >
                        Open company
                      </Link>
                      <button
                        type="button"
                        style={styles.notificationReadButton}
                        disabled={Boolean(notificationBusyById[notification.id])}
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        {notificationBusyById[notification.id] ? "Saving..." : "Mark as read"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div style={styles.headerRow}>
          <div style={styles.filterField}>
            <span style={styles.filterLabel}>Group</span>
            <select style={styles.filterSelect} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
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
            <select style={styles.filterSelect} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
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
            <select style={styles.filterSelect} value={lockFilter} onChange={(e) => setLockFilter(e.target.value)}>
              <option value="all">All lock states</option>
              <option value="locked">Locked</option>
              <option value="unlocked">Unlocked</option>
            </select>
          </div>
          <div style={styles.filterField}>
            <span style={styles.filterLabel}>Due date</span>
            <select style={styles.filterSelect} value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
              <option value="all">All due dates</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due in 7 days</option>
              <option value="has_due">Has due date</option>
              <option value="no_due">No due date</option>
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
                <th style={styles.th}>Due date</th>
                <th style={styles.th}>Tasks</th>
                <th style={styles.th}>Lock status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td style={styles.td} colSpan={8}>
                    Loading companies...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td style={styles.td} colSpan={8}>
                    No companies match your filters.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => {
                  const overdue = isOverdue(company);
                  const holdsLock = Boolean(company.lock && company.lock.actorId === actorId);
                  const lockedByOther = Boolean(company.lock && company.lock.actorId !== actorId);
                  const canClaim = actorName.trim().length >= 2 && !company.lock;
                  const canForceRelease =
                    lockedByOther && (employeeType === "manager" || employeeType === "partner");
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

                  return (
                    <tr key={company.id} style={overdue ? styles.trOverdue : undefined}>
                      <td style={styles.tdStrong}>{company.name}</td>
                      <td style={styles.tdMono}>{company.organizationNumber}</td>
                      <td style={styles.td}>{company.group}</td>
                      <td style={styles.td}>
                        {company.auditStage ? (
                          <span style={{ ...styles.stageChip, ...getStageChipStyle(company.auditStage) }}>
                            {company.auditStage}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={styles.td}>
                        {canEditDueDate ? (
                          <input
                            type="date"
                            value={company.taskDueDate || ""}
                            style={styles.dueDateInput}
                            disabled={busyDueCompanyId === company.id}
                            onChange={(e) => updateCompanyDueDate(company.id, e.target.value)}
                          />
                        ) : (
                          company.taskDueDate || "-"
                        )}
                      </td>
                      <td style={styles.td}>{company.taskCount}</td>
                      <td style={styles.tdLock}>
                        <span style={styles.lockStatusSlot}>{formatLock(company.lock)}</span>
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
                                holdsLock || canForceRelease
                                  ? busyCompanyId === company.id
                                  : busyCompanyId === company.id || !canClaim
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
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

const styles = {
  pageTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    flexWrap: "wrap",
  },
  topActions: {
    display: "flex",
    alignItems: "center",
    gap: ".55rem",
  },
  bellButton: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    fontSize: 18,
    lineHeight: 1,
  },
  bellBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    minWidth: 24,
    height: 20,
    borderRadius: 999,
    border: "1px solid #fdba74",
    background: "#fff7ed",
    color: "#9a3412",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 .3rem",
  },
  dashboardLink: {
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
  notificationsWrap: {
    marginBottom: "1rem",
    border: "1px solid #fed7aa",
    borderRadius: 12,
    background: "#fff7ed",
    padding: ".65rem .75rem",
  },
  notificationsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ".5rem",
  },
  notificationsTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".02em",
    color: "#9a3412",
  },
  notificationsCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    background: "#fff",
    color: "#9a3412",
    fontSize: 12,
    fontWeight: 700,
    padding: "0 .35rem",
  },
  notificationsList: {
    display: "grid",
    gap: ".45rem",
  },
  notificationsEmpty: {
    fontSize: 13,
    color: "#9a3412",
    background: "#fff",
    border: "1px dashed #fdba74",
    borderRadius: 10,
    padding: ".55rem .6rem",
  },
  notificationItem: {
    border: "1px solid #fdba74",
    borderRadius: 10,
    background: "#fff",
    padding: ".5rem .6rem",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#7c2d12",
    lineHeight: 1.4,
  },
  notificationMeta: {
    marginTop: ".2rem",
    display: "inline-flex",
    gap: ".35rem",
    fontSize: 12,
    color: "#9a3412",
    alignItems: "center",
  },
  notificationActions: {
    marginTop: ".45rem",
    display: "flex",
    gap: ".45rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  notificationOpenLink: {
    borderRadius: 8,
    border: "1px solid #fdba74",
    background: "#fff7ed",
    color: "#9a3412",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 700,
    padding: ".32rem .56rem",
  },
  notificationReadButton: {
    borderRadius: 8,
    border: "1px solid #fdba74",
    background: "#fff",
    color: "#9a3412",
    fontSize: 12,
    fontWeight: 700,
    padding: ".32rem .56rem",
    cursor: "pointer",
  },
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
  dueDateInput: {
    padding: ".4rem .5rem",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    width: 150,
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
  trOverdue: {
    background: "#fff7ed",
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
