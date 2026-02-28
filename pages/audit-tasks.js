import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuditTasksTab from "../components/audit/AuditTasksTab";
import ActivityTimeline from "../components/audit/ActivityTimeline";
import CompanyLockBar from "../components/audit/CompanyLockBar";
import CompanyInfoCard from "../components/audit/CompanyInfoCard";
import RiskResponsibilityTab from "../components/audit/RiskResponsibilityTab";
import { styles } from "../components/audit/auditTasksStyles";

const TASKS_POLL_MS = 5000;

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AuditTasks() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [activity, setActivity] = useState([]);
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
  const [activeTab, setActiveTab] = useState("audit_tasks");

  const holdsLock = Boolean(lock && actorId && lock.actorId === actorId);
  const canEdit = holdsLock;
  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const routeCompanyName =
    typeof router.query.companyName === "string" ? router.query.companyName : "";

  const currentStage = selectedCompany?.auditStage;
  const isAuditor = actorRole === "auditor";
  const isPartner = actorRole === "partner";
  const canAdvanceByStage = Boolean(
    currentStage && currentStage !== "Partner review" && currentStage !== "Signing"
  );
  const auditorCanAdvance = !isAuditor || currentStage === "First time auditing";
  const canUseNextStage = holdsLock && canAdvanceByStage && auditorCanAdvance;
  const canSendToSigning = holdsLock && isPartner && currentStage === "Partner review";
  const isFinalReviewOrLater =
    currentStage === "Partner review" || currentStage === "Signing";
  const showNextStageButton =
    !isFinalReviewOrLater && !(isAuditor && currentStage !== "First time auditing");
  const showSendToSigningButton = isPartner && currentStage === "Partner review";
  const riskResponses = {
    overall_risk_assessed:
      selectedCompany?.overallRiskAssessed === true
        ? "yes"
        : selectedCompany?.overallRiskAssessed === false
        ? "no"
        : "",
    fraud_risk_documented:
      selectedCompany?.fraudRiskDocumented === true
        ? "yes"
        : selectedCompany?.fraudRiskDocumented === false
        ? "no"
        : "",
    controls_tested:
      selectedCompany?.controlsTested === true
        ? "yes"
        : selectedCompany?.controlsTested === false
        ? "no"
        : "",
    partner_review_ready:
      selectedCompany?.partnerReviewReady === true
        ? "yes"
        : selectedCompany?.partnerReviewReady === false
        ? "no"
        : "",
  };

  const normalizedQuery = taskQuery.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const rowStatus = String(row.status || "").toLowerCase();
    const matchesStatus = statusFilter === "all" ? true : rowStatus === statusFilter;
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
      setActivity(data.activity || []);
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

  async function updateRiskResponse(key, value) {
    if (!holdsLock || !selectedCompanyId) {
      return;
    }
    const boolValue = value === "yes";
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_risk_checklist",
          companyId: selectedCompanyId,
          actorId,
          field: key,
          value: boolValue,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not update risk checklist.");
      }
      if (data.company) {
        setCompanies((prev) =>
          prev.map((company) =>
            company.id === data.company.id ? { ...company, ...data.company } : company
          )
        );
      }
      if (data.lock !== undefined) {
        setLock(data.lock);
      }
    } catch (updateError) {
      setError(updateError.message || "Could not update risk checklist.");
    }
  }

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

      setRows((prevRows) => prevRows.map((row) => (row.id === id ? data.task : row)));
      setLock(data.lock || null);
    } catch (saveError) {
      if (fallbackRow) {
        setRows((prevRows) => prevRows.map((row) => (row.id === id ? fallbackRow : row)));
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
          <h1 style={{ margin: 0 }}>{selectedCompany?.name || routeCompanyName || "Company"}</h1>
          <p style={{ marginTop: ".35rem", color: "#4b5563" }}>Company audit workspace.</p>
        </header>

        <CompanyInfoCard
          styles={styles}
          selectedCompany={selectedCompany}
          showNextStageButton={showNextStageButton}
          showSendToSigningButton={showSendToSigningButton}
          stagePressed={stagePressed}
          stageBusy={stageBusy}
          stageJustAdvanced={stageJustAdvanced}
          signingPressed={signingPressed}
          signingBusy={signingBusy}
          canUseNextStage={canUseNextStage}
          canSendToSigning={canSendToSigning}
          onAdvanceStage={advanceStage}
          onSendToSigning={sendToSigning}
          onStageMouseDown={() => setStagePressed(true)}
          onStageMouseUp={() => setStagePressed(false)}
          onStageMouseLeave={() => setStagePressed(false)}
          onSigningMouseDown={() => setSigningPressed(true)}
          onSigningMouseUp={() => setSigningPressed(false)}
          onSigningMouseLeave={() => setSigningPressed(false)}
        />

        <CompanyLockBar
          styles={styles}
          actorName={actorName}
          onActorNameChange={(e) => setActorName(e.target.value)}
          actorId={actorId}
          actorRole={actorRole}
          lock={lock}
          holdsLock={holdsLock}
          lockBusy={lockBusy}
          selectedCompanyId={selectedCompanyId}
          onUpdateLock={updateLock}
        />

        <div style={styles.tabsRow}>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(activeTab === "audit_tasks" ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab("audit_tasks")}
          >
            Audit tasks
          </button>
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(activeTab === "risk_responsibility" ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab("risk_responsibility")}
          >
            Risk & responsibility
          </button>
        </div>

        {activeTab === "audit_tasks" ? (
          <AuditTasksTab
            styles={styles}
            taskQuery={taskQuery}
            statusFilter={statusFilter}
            onTaskQueryChange={(e) => setTaskQuery(e.target.value)}
            onStatusFilterChange={(e) => setStatusFilter(e.target.value)}
            error={error}
            loading={loading}
            filteredRows={filteredRows}
            canEdit={canEdit}
            onStatusChange={handleStatusChange}
            onCommentChange={handleCommentChange}
            onCommentBlur={handleCommentBlur}
            onCommentInput={autoResizeComment}
            savingById={savingById}
          />
        ) : (
          <RiskResponsibilityTab
            styles={styles}
            selectedCompany={selectedCompany}
            responses={riskResponses}
            onResponseChange={updateRiskResponse}
            canEdit={holdsLock}
          />
        )}

        <div style={{ marginTop: "1rem" }}>
          <ActivityTimeline styles={styles} activity={activity} />
        </div>
      </main>
    </>
  );
}
