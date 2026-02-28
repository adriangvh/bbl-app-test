// pages/audit-tasks.js
import Head from "next/head";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const TASKS_POLL_MS = 5000;

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

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StatusSelect({ value, onChange, disabled }) {
  const map = {
    Completed: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    "Needs review": { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    "In progress": { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    Blocked: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  };
  const s = map[value] || { bg: "#f3f4f6", border: "#e5e7eb", text: "#111827" };

  return (
    <div style={{ ...styles.statusSelectWrap, background: s.bg, borderColor: s.border }}>
      <select
        style={{
          ...styles.statusSelect,
          color: s.text,
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label="Task status"
      >
        <option>Completed</option>
        <option>Needs review</option>
        <option>In progress</option>
        <option>Blocked</option>
      </select>
      <span style={{ ...styles.statusChevron, color: s.text }} aria-hidden="true">
        v
      </span>
    </div>
  );
}

export default function AuditTasks() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [lock, setLock] = useState(null);
  const [lockBusy, setLockBusy] = useState(false);
  const [actorId, setActorId] = useState("");
  const [actorName, setActorName] = useState("");
  const [actorRole, setActorRole] = useState("auditor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingById, setSavingById] = useState({});
  const [stageBusy, setStageBusy] = useState(false);
  const [stageJustAdvanced, setStageJustAdvanced] = useState(false);
  const [stagePressed, setStagePressed] = useState(false);
  const [signingBusy, setSigningBusy] = useState(false);
  const [signingPressed, setSigningPressed] = useState(false);
  const [taskQuery, setTaskQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const holdsLock = Boolean(lock && actorId && lock.actorId === actorId);
  const canEdit = holdsLock;
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const routeCompanyName =
    typeof router.query.companyName === "string" ? router.query.companyName : "";
  const normalizedQuery = taskQuery.trim().toLowerCase();
  const currentStage = selectedCompany?.auditStage;
  const isAuditor = actorRole === "auditor";
  const isPartner = actorRole === "partner";
  const canAdvanceByStage = Boolean(
    currentStage &&
      currentStage !== "Partner review" &&
      currentStage !== "Signing"
  );
  const auditorCanAdvance =
    !isAuditor || currentStage === "First time auditing";
  const canUseNextStage = holdsLock && canAdvanceByStage && auditorCanAdvance;
  const canSendToSigning =
    holdsLock && isPartner && currentStage === "Partner review";

  const filteredRows = rows.filter((row) => {
    const rowStatus = String(row.status || "").toLowerCase();
    const matchesStatus =
      statusFilter === "all" ? true : rowStatus === statusFilter;
    if (!matchesStatus) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const searchBlob = [
      row.taskNumber,
      row.task,
      row.description,
      row.comment,
      row.evidence,
      row.status,
    ]
      .join(" ")
      .toLowerCase();
    return searchBlob.includes(normalizedQuery);
  });

  function updateRowLocal(id, key, value) {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [key]: value, lastUpdated: getTodayIso() } : row
      )
    );
  }

  async function loadRows(companyId, options = {}) {
    const { silent = false } = options;
    if (!silent) {
      setLoading(true);
      setError("");
      setSavingById({});
    }
    try {
      const params = new URLSearchParams();
      if (companyId) {
        params.set("companyId", companyId);
      }
      const query = params.toString();
      const response = await fetch(`/api/audit-tasks${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Could not load tasks.");
      }
      const data = await response.json();
      setCompanies(data.companies || []);
      setSelectedCompanyId(data.selectedCompanyId || "");
      const isTypingComment =
        typeof document !== "undefined" &&
        document.activeElement &&
        document.activeElement.tagName === "TEXTAREA";
      if (!(silent && isTypingComment)) {
        setRows(data.tasks || []);
      }
      setLock(data.lock || null);
    } catch (loadError) {
      if (!silent) {
        setError(loadError.message || "Could not load tasks.");
      }
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
    const existingActorRole = window.localStorage.getItem("auditEmployeeType");
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
    if (existingActorRole) {
      setActorRole(existingActorRole);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const routeCompanyId =
      typeof router.query.companyId === "string" ? router.query.companyId : undefined;
    loadRows(routeCompanyId);
  }, [router.isReady, router.query.companyId]);

  useEffect(() => {
    if (typeof window !== "undefined" && actorName) {
      window.localStorage.setItem("auditActorName", actorName);
    }
  }, [actorName]);

  useEffect(() => {
    if (!holdsLock || !selectedCompanyId || !actorId) {
      return;
    }
    const interval = setInterval(() => {
      updateLock("renew");
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [holdsLock, selectedCompanyId, actorId]);

  useEffect(() => {
    if (!selectedCompanyId) {
      return;
    }
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      loadRows(selectedCompanyId, { silent: true });
    }, TASKS_POLL_MS);
    return () => clearInterval(timer);
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!stageJustAdvanced) {
      return;
    }
    const timer = setTimeout(() => {
      setStageJustAdvanced(false);
    }, 1700);
    return () => clearTimeout(timer);
  }, [stageJustAdvanced]);

  async function persistPatch(id, patch, fallbackRow, companyId) {
    if (!companyId || !actorId) {
      return;
    }

    setSavingById((prev) => ({ ...prev, [id]: true }));
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, id, actorId, ...patch }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not save task changes.");
      }

      setRows((prevRows) =>
        prevRows.map((row) => (row.id === id ? data.task : row))
      );
      setLock(data.lock || null);
    } catch (saveError) {
      if (fallbackRow) {
        setRows((prevRows) =>
          prevRows.map((row) => (row.id === id ? fallbackRow : row))
        );
      }
      setError(saveError.message || "Could not save task changes.");
    } finally {
      setSavingById((prev) => ({ ...prev, [id]: false }));
    }
  }

  function handleStatusChange(id, value) {
    const companyId = selectedCompanyId;
    const currentRow = rows.find((row) => row.id === id);
    if (!currentRow || !companyId || !canEdit) {
      return;
    }
    const fallbackRow = { ...currentRow };
    updateRowLocal(id, "status", value);
    persistPatch(id, { status: value }, fallbackRow, companyId);
  }

  function handleCommentChange(id, value) {
    if (!canEdit) {
      return;
    }
    updateRowLocal(id, "comment", value);
  }

  function handleCommentBlur(id) {
    const companyId = selectedCompanyId;
    const currentRow = rows.find((row) => row.id === id);
    if (!currentRow || !companyId || !canEdit) {
      return;
    }
    persistPatch(id, { comment: currentRow.comment }, undefined, companyId);
  }

  function autoResizeComment(event) {
    const field = event.currentTarget;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }

  async function updateLock(action) {
    if (!selectedCompanyId || !actorId) {
      return;
    }
    setLockBusy(true);
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          companyId: selectedCompanyId,
          actorId,
          actorName,
          actorRole,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not update lock.");
      }
      setLock(data.lock || null);
    } catch (lockError) {
      setError(lockError.message || "Could not update lock.");
    } finally {
      setLockBusy(false);
    }
  }

  async function advanceStage() {
    if (!selectedCompanyId || !actorId) {
      return;
    }
    setStageBusy(true);
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance_stage",
          companyId: selectedCompanyId,
          actorId,
          actorRole,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not move company to next stage.");
      }
      if (data.lock !== undefined) {
        setLock(data.lock);
      }
      if (data.company) {
        setCompanies((prev) =>
          prev.map((company) =>
            company.id === data.company.id ? { ...company, ...data.company } : company
          )
        );
      }
      setStageJustAdvanced(true);
    } catch (stageError) {
      setError(stageError.message || "Could not move company to next stage.");
    } finally {
      setStageBusy(false);
      setStagePressed(false);
    }
  }

  async function sendToSigning() {
    if (!selectedCompanyId || !actorId) {
      return;
    }
    setSigningBusy(true);
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_to_signing",
          companyId: selectedCompanyId,
          actorId,
          actorRole,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not send company to signing.");
      }
      if (data.lock !== undefined) {
        setLock(data.lock);
      }
      if (data.company) {
        setCompanies((prev) =>
          prev.map((company) =>
            company.id === data.company.id ? { ...company, ...data.company } : company
          )
        );
      }
    } catch (sendError) {
      setError(sendError.message || "Could not send company to signing.");
    } finally {
      setSigningBusy(false);
      setSigningPressed(false);
    }
  }

  return (
    <>
      <Head>
        <title>Audit Tasks</title>
        <meta name="description" content="Auditor task tracking table" />
      </Head>

      <main>
        <div style={styles.topNavBar}>
          <Link href="/" style={styles.topBackLink}>
            Back to Companies
          </Link>
          <div style={styles.topCompanyBadge}>
            {selectedCompany?.name || routeCompanyName || "Selected Company"}
          </div>
        </div>

        <header style={{ marginBottom: "1.25rem" }}>
          <h1 style={{ margin: 0 }}>Audit Tasks</h1>
          <p style={{ marginTop: ".35rem", color: "#4b5563" }}>
            Track audit procedures, descriptions, automation coverage, and status.
          </p>
        </header>

        <section style={styles.companyInfoCard}>
          <div style={styles.companyInfoHeader}>
            <h2 style={styles.companyInfoTitle}>Company Information</h2>
            <div style={styles.stageButtons}>
              <button
                style={{
                  ...styles.nextStageButton,
                  ...(stagePressed ? styles.nextStageButtonPressed : {}),
                  ...(stageBusy ? styles.nextStageButtonBusy : {}),
                  ...(stageJustAdvanced ? styles.nextStageButtonDone : {}),
                }}
                disabled={!canUseNextStage || stageBusy}
                onClick={advanceStage}
                onMouseDown={() => setStagePressed(true)}
                onMouseUp={() => setStagePressed(false)}
                onMouseLeave={() => setStagePressed(false)}
              >
                {stageBusy ? "Sending to next stage..." : "Send to next stage"}
              </button>
              {isPartner && (
                <button
                  style={{
                    ...styles.signingButton,
                    ...(signingPressed ? styles.signingButtonPressed : {}),
                    ...(signingBusy ? styles.signingButtonBusy : {}),
                  }}
                  disabled={!canSendToSigning || signingBusy}
                  onClick={sendToSigning}
                  onMouseDown={() => setSigningPressed(true)}
                  onMouseUp={() => setSigningPressed(false)}
                  onMouseLeave={() => setSigningPressed(false)}
                >
                  {signingBusy
                    ? "Sending to signing..."
                    : "Accept and send to signing"}
                </button>
              )}
            </div>
          </div>
          <div style={styles.companyInfoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>organization_type</span>
              <span style={styles.infoValue}>
                {selectedCompany?.organizationType || "-"}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>responsible_partner</span>
              <span style={styles.infoValue}>
                {selectedCompany?.responsiblePartner || "-"}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>company_group</span>
              <span style={styles.infoValue}>{selectedCompany?.group || "-"}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>organization_number</span>
              <span style={styles.infoValue}>
                {selectedCompany?.organizationNumber || "-"}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>audit_stage</span>
              <span style={styles.infoValue}>
                {selectedCompany?.auditStage ? (
                  <span
                    style={{
                      ...styles.stageChip,
                      ...getStageChipStyle(selectedCompany.auditStage),
                    }}
                  >
                    {selectedCompany.auditStage}
                  </span>
                ) : (
                  "-"
                )}
              </span>
            </div>
          </div>
        </section>

        <div style={styles.card}>
          <div style={styles.toolbar}>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <input
                placeholder="Search tasks…"
                style={styles.input}
                value={taskQuery}
                onChange={(e) => setTaskQuery(e.target.value)}
              />
              <select
                style={styles.select}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="completed">Completed</option>
                <option value="needs review">Needs review</option>
                <option value="in progress">In progress</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
          <div style={styles.lockBar}>
            <input
              style={styles.nameInput}
              placeholder="Your name"
              value={actorName}
              onChange={(e) => setActorName(e.target.value)}
            />
            {(() => {
              const lockedByOther = Boolean(lock && lock.actorId !== actorId);
              const canForceRelease =
                lockedByOther &&
                (actorRole === "manager" || actorRole === "partner");

              if (holdsLock) {
                return (
                  <button
                    style={styles.lockButton}
                    onClick={() => updateLock("release")}
                    disabled={lockBusy || !selectedCompanyId}
                  >
                    Release lock
                  </button>
                );
              }

              if (canForceRelease) {
                return (
                  <button
                    style={{ ...styles.lockButton, ...styles.forceReleaseButton }}
                    onClick={() => updateLock("force_release")}
                    disabled={lockBusy || !selectedCompanyId}
                  >
                    Release other lock
                  </button>
                );
              }

              if (!lock) {
                return (
                  <button
                    style={styles.lockButton}
                    onClick={() => updateLock("claim")}
                    disabled={lockBusy || !selectedCompanyId || actorName.trim().length < 2}
                  >
                    Claim lock
                  </button>
                );
              }

              return null;
            })()}
            <span style={styles.lockText}>
              {holdsLock
                ? `Locked by you until ${new Date(lock.expiresAt).toLocaleTimeString()}`
                : lock
                ? `Locked by ${lock.actorName}`
                : "No lock active"}
            </span>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Task no.</th>
                  <th style={styles.th}>Task</th>
                  <th style={styles.th}>Task description</th>
                  <th style={styles.th}>Robot processed</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Comment</th>
                  <th style={styles.th}>Evidence / output</th>
                  <th style={styles.th}>Last updated</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr style={styles.tr}>
                    <td style={styles.td} colSpan={8}>
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr style={styles.tr}>
                    <td style={styles.td} colSpan={8}>
                      No tasks match your filters.
                    </td>
                  </tr>
                ) : filteredRows.map((r) => (
                  <tr key={r.id} style={styles.tr}>
                    <td style={styles.tdMono}>{r.taskNumber || "-"}</td>
                    <td style={styles.tdStrong}>{r.task}</td>
                    <td style={styles.td}>{r.description}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: r.robotProcessed ? "#10b981" : "#9ca3af",
                          }}
                        />
                        {r.robotProcessed ? "Yes" : "No"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <StatusSelect
                        value={r.status}
                        disabled={!canEdit}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      />
                    </td>
                    <td style={styles.tdComment}>
                      <textarea
                        style={styles.rowTextarea}
                        value={r.comment}
                        placeholder="Add comment"
                        disabled={!canEdit}
                        onChange={(e) => handleCommentChange(r.id, e.target.value)}
                        onInput={autoResizeComment}
                        onBlur={() => handleCommentBlur(r.id)}
                        rows={3}
                      />
                    </td>
                    <td style={styles.td}>{r.evidence}</td>
                    <td style={styles.tdMono}>
                      {r.lastUpdated}
                      <span style={styles.savingSlot}>
                        {savingById[r.id] ? " saving..." : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.note}>
            Data is persisted per company in a local file-backed database via `/api/audit-tasks`.
          </div>
        </div>
      </main>
    </>
  );
}

const styles = {
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  companyInfoCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    padding: "1rem",
    marginBottom: "1rem",
  },
  companyInfoTitle: {
    margin: 0,
    fontSize: 16,
  },
  companyInfoHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: ".75rem",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: ".75rem",
  },
  stageButtons: {
    display: "flex",
    alignItems: "center",
    gap: ".5rem",
    flexWrap: "wrap",
  },
  companyInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: ".7rem",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column",
    gap: ".2rem",
    padding: ".65rem .7rem",
    border: "1px solid #f1f5f9",
    borderRadius: 10,
    background: "#fafafa",
  },
  infoLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: ".02em",
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
    minHeight: 22,
    display: "inline-flex",
    alignItems: "center",
  },
  stageChip: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    border: "1px solid",
    padding: ".2rem .56rem",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  nextStageButton: {
    padding: ".52rem .86rem",
    borderRadius: 10,
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
    transition: "all 120ms ease",
  },
  nextStageButtonPressed: {
    transform: "translateY(1px)",
    background: "#e0e7ff",
    borderColor: "#a5b4fc",
    boxShadow: "0 0 0 rgba(0,0,0,0)",
  },
  nextStageButtonBusy: {
    opacity: 0.82,
    background: "#e5e7eb",
    color: "#374151",
    borderColor: "#d1d5db",
    cursor: "progress",
  },
  nextStageButtonDone: {
    borderColor: "#86efac",
    background: "#f0fdf4",
    color: "#166534",
    boxShadow: "0 1px 2px rgba(22, 101, 52, 0.12)",
  },
  signingButton: {
    padding: ".52rem .86rem",
    borderRadius: 10,
    border: "1px solid #86efac",
    background: "#f0fdf4",
    color: "#166534",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 13,
    boxShadow: "0 1px 2px rgba(22, 101, 52, 0.1)",
    transition: "all 120ms ease",
  },
  signingButtonPressed: {
    transform: "translateY(1px)",
    background: "#dcfce7",
    borderColor: "#4ade80",
    boxShadow: "0 0 0 rgba(0,0,0,0)",
  },
  signingButtonBusy: {
    opacity: 0.82,
    background: "#e5e7eb",
    color: "#374151",
    borderColor: "#d1d5db",
    cursor: "progress",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "1rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#fafafa",
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    padding: ".55rem .75rem",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    minWidth: 220,
    outline: "none",
  },
  topNavBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ".8rem",
    padding: ".75rem .9rem",
    border: "1px solid #dbeafe",
    borderRadius: 12,
    background: "#eff6ff",
    marginBottom: "1rem",
    flexWrap: "wrap",
  },
  topBackLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: ".35rem",
    color: "#1d4ed8",
    textDecoration: "none",
    fontWeight: 700,
    background: "#fff",
    border: "1px solid #bfdbfe",
    borderRadius: 10,
    padding: ".45rem .7rem",
  },
  topCompanyBadge: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e3a8a",
    background: "#dbeafe",
    border: "1px solid #bfdbfe",
    borderRadius: 999,
    padding: ".35rem .7rem",
    whiteSpace: "nowrap",
  },
  nameInput: {
    padding: ".5rem .65rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
    minWidth: 160,
  },
  select: {
    padding: ".55rem .75rem",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "#fff",
    minWidth: 150,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    letterSpacing: ".02em",
    textTransform: "uppercase",
    color: "#6b7280",
    padding: ".85rem 1rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 1,
    whiteSpace: "nowrap",
  },
  tr: {
    background: "#fff",
  },
  td: {
    padding: ".85rem 1rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
    color: "#111827",
    fontSize: 14,
  },
  tdStrong: {
    padding: ".85rem 1rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
    color: "#111827",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  tdMono: {
    padding: ".85rem 1rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
    color: "#111827",
    fontSize: 13,
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    whiteSpace: "nowrap",
    minWidth: 170,
  },
  note: {
    padding: "0.9rem 1rem",
    color: "#6b7280",
    fontSize: 13,
    background: "#fafafa",
    borderTop: "1px solid #e5e7eb",
  },
  statusSelectWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    paddingRight: "1.35rem",
    width: 150,
    flexShrink: 0,
  },
  statusSelect: {
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    border: "none",
    background: "transparent",
    padding: ".35rem .7rem",
    paddingRight: ".2rem",
    borderRadius: 999,
    outline: "none",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  statusChevron: {
    position: "absolute",
    right: ".55rem",
    fontSize: 11,
    pointerEvents: "none",
    lineHeight: 1,
  },
  tdComment: {
    padding: ".85rem 1rem",
    borderBottom: "1px solid #f3f4f6",
    verticalAlign: "top",
    color: "#111827",
    fontSize: 14,
    minWidth: 360,
  },
  rowTextarea: {
    width: "100%",
    minWidth: 320,
    minHeight: 82,
    padding: ".55rem .65rem",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    outline: "none",
    fontSize: 13,
    lineHeight: 1.4,
    resize: "none",
    overflow: "hidden",
    fontFamily: "inherit",
  },
  lockBar: {
    display: "flex",
    alignItems: "center",
    gap: ".6rem",
    padding: ".7rem 1rem",
    borderBottom: "1px solid #e5e7eb",
    background: "#f8fafc",
    flexWrap: "wrap",
  },
  lockButton: {
    padding: ".45rem .75rem",
    borderRadius: 10,
    border: "1px solid #111827",
    background: "#111827",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  forceReleaseButton: {
    borderColor: "#f59e0b",
    background: "#fffbeb",
    color: "#92400e",
  },
  lockText: {
    fontSize: 13,
    color: "#4b5563",
  },
  error: {
    padding: ".75rem 1rem",
    fontSize: 13,
    color: "#991b1b",
    background: "#fef2f2",
    borderBottom: "1px solid #fecaca",
  },
  savingSlot: {
    display: "inline-block",
    minWidth: 70,
  },
};
