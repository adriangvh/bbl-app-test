import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import AuditTasksTab from "../components/audit/AuditTasksTab";
import ActivityTimeline from "../components/audit/ActivityTimeline";
import CompanyLockBar from "../components/audit/CompanyLockBar";
import CompanyInfoCard from "../components/audit/CompanyInfoCard";
import PresencePanel from "../components/audit/PresencePanel";
import RiskResponsibilityTab from "../components/audit/RiskResponsibilityTab";
import SigningDocumentTab from "../components/audit/SigningDocumentTab";
import { styles } from "../components/audit/auditTasksStyles";

const TASKS_POLL_MS = 5000;
const PRESENCE_PING_MS = 10000;

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaultSigningDocument(company) {
  const companyName = company?.name || "Unknown Company";
  const orgNo = company?.organizationNumber || "Unknown";
  return `
<h2>1. Engagement Summary</h2>
<p>This signing document covers the annual audit for <strong>${companyName}</strong> (${orgNo}).</p>
<h2>2. Scope Performed</h2>
<ul>
  <li>Financial statement procedures completed.</li>
  <li>Risk and control testing reviewed.</li>
  <li>Outstanding exceptions discussed with management.</li>
</ul>
<h2>3. Key Findings</h2>
<ul>
  <li>No material misstatements identified.</li>
  <li>Significant estimates reviewed and documented.</li>
  <li>Final management representation received.</li>
</ul>
<h2>4. Partner Conclusion</h2>
<p>Based on the completed procedures and review evidence, the engagement is considered ready for final signing.</p>
<h2>5. Notes Before Signing</h2>
<ul>
  <li>Add any final partner comments here.</li>
  <li>Add any conditions for follow-up in next cycle.</li>
</ul>`.trim();
}

export default function AuditTasks() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [activity, setActivity] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [discussionBusyByTask, setDiscussionBusyByTask] = useState({});
  const [mentionUsers, setMentionUsers] = useState([]);
  const [presence, setPresence] = useState([]);
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
  const [signingDocumentDraft, setSigningDocumentDraft] = useState("");
  const [signingDocumentDirty, setSigningDocumentDirty] = useState(false);
  const [signingDocumentBusy, setSigningDocumentBusy] = useState(false);

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
  const mentionCandidates = useMemo(() => {
    const map = new Map();
    (mentionUsers || []).forEach((user) => {
      const handle = String(user.handle || "").trim().toLowerCase();
      const label = String(user.label || "").trim();
      if (!handle || !label) {
        return;
      }
      if (!map.has(handle)) {
        map.set(handle, { label, handle });
      }
    });

    [actorName, ...presence.map((person) => person.actorName), ...activity.map((event) => event.actorName), ...discussions.map((discussion) => discussion.authorName)]
      .map((name) => String(name || "").trim())
      .filter(Boolean)
      .forEach((name) => {
        const handle = name
          .toLowerCase()
          .replace(/\s+/g, ".")
          .replace(/[^a-z0-9._-]/g, "");
        if (!handle) {
          return;
        }
        if (!map.has(handle)) {
          map.set(handle, { label: name, handle });
        }
      });

    return Array.from(map.values()).sort((a, b) => a.handle.localeCompare(b.handle));
  }, [mentionUsers, actorName, presence, activity, discussions]);

  useEffect(() => {
    if (!isPartner && activeTab === "signing_document") {
      setActiveTab("audit_tasks");
    }
  }, [isPartner, activeTab]);

  useEffect(() => {
    if (!selectedCompany) {
      if (!signingDocumentDirty) {
        setSigningDocumentDraft("");
      }
      return;
    }
    if (signingDocumentDirty) {
      return;
    }
    setSigningDocumentDraft(
      selectedCompany.signingDocument || buildDefaultSigningDocument(selectedCompany)
    );
  }, [selectedCompanyId, selectedCompany?.signingDocument, signingDocumentDirty]);

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
      if (actorName.trim()) {
        params.set("viewerName", actorName.trim());
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
      setDiscussions(data.discussions || []);
      setMentionUsers(data.mentionUsers || []);
      setPresence(data.presence || []);
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
    if (!selectedCompanyId || !actorName.trim()) {
      return;
    }
    loadRows(selectedCompanyId, { silent: true });
  }, [actorName]);

  useEffect(() => {
    if (!stageJustAdvanced) {
      return;
    }
    const timer = setTimeout(() => {
      setStageJustAdvanced(false);
    }, 1700);
    return () => clearTimeout(timer);
  }, [stageJustAdvanced]);

  async function pingPresence(tab = activeTab) {
    if (!selectedCompanyId || !actorId) {
      return;
    }
    try {
      await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "presence_ping",
          companyId: selectedCompanyId,
          actorId,
          actorName,
          actorRole,
          activeTab: tab,
        }),
      });
    } catch {
      // Presence is best effort.
    }
  }

  function leavePresence() {
    if (!selectedCompanyId || !actorId) {
      return;
    }
    fetch("/api/audit-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "presence_leave",
        companyId: selectedCompanyId,
        actorId,
      }),
      keepalive: true,
    }).catch(() => {});
  }

  useEffect(() => {
    if (!selectedCompanyId || !actorId) {
      return;
    }
    pingPresence(activeTab);
    const timer = setInterval(() => {
      pingPresence(activeTab);
    }, PRESENCE_PING_MS);
    return () => clearInterval(timer);
  }, [selectedCompanyId, actorId, actorName, actorRole, activeTab]);

  useEffect(() => {
    const onPageHide = () => leavePresence();
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("beforeunload", onPageHide);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("beforeunload", onPageHide);
      }
      leavePresence();
    };
  }, [selectedCompanyId, actorId]);

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

  async function addTaskDiscussion(taskId, message) {
    if (!selectedCompanyId || !actorId) {
      return false;
    }
    setDiscussionBusyByTask((prev) => ({ ...prev, [taskId]: true }));
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_task_discussion",
          companyId: selectedCompanyId,
          actorId,
          actorName,
          taskId,
          message,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not add discussion comment.");
      }
      if (data.comment) {
        setDiscussions((prev) => [...prev, data.comment]);
      }
      return true;
    } catch (discussionError) {
      setError(discussionError.message || "Could not add discussion comment.");
      return false;
    } finally {
      setDiscussionBusyByTask((prev) => ({ ...prev, [taskId]: false }));
    }
  }

  function handleSigningDocumentChange(nextValue) {
    setSigningDocumentDraft(nextValue);
    setSigningDocumentDirty(true);
  }

  function resetSigningDocumentDraft() {
    setSigningDocumentDraft(
      selectedCompany?.signingDocument || buildDefaultSigningDocument(selectedCompany)
    );
    setSigningDocumentDirty(false);
  }

  async function saveSigningDocument() {
    if (!selectedCompanyId || !actorId || !isPartner) {
      return;
    }
    setSigningDocumentBusy(true);
    setError("");
    try {
      const response = await fetch("/api/audit-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_signing_document",
          companyId: selectedCompanyId,
          actorId,
          actorRole,
          content: signingDocumentDraft,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.lock !== undefined) {
          setLock(data.lock);
        }
        throw new Error(data.error || "Could not save signing document.");
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
      setSigningDocumentDirty(false);
    } catch (saveError) {
      setError(saveError.message || "Could not save signing document.");
    } finally {
      setSigningDocumentBusy(false);
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

        <PresencePanel styles={styles} presence={presence} actorId={actorId} />

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
          <button
            type="button"
            style={{
              ...styles.tabButton,
              ...(activeTab === "activity" ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab("activity")}
          >
            Activity
          </button>
          {isPartner && (
            <button
              type="button"
              style={{
                ...styles.tabButton,
                ...(activeTab === "signing_document" ? styles.tabButtonActive : {}),
              }}
              onClick={() => setActiveTab("signing_document")}
            >
              Signing document
            </button>
          )}
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
            discussions={discussions}
            onAddTaskDiscussion={addTaskDiscussion}
            discussionBusyByTask={discussionBusyByTask}
            mentionCandidates={mentionCandidates}
          />
        ) : activeTab === "risk_responsibility" ? (
          <RiskResponsibilityTab
            styles={styles}
            selectedCompany={selectedCompany}
            responses={riskResponses}
            onResponseChange={updateRiskResponse}
            canEdit={holdsLock}
          />
        ) : activeTab === "signing_document" ? (
          <SigningDocumentTab
            styles={styles}
            selectedCompany={selectedCompany}
            value={signingDocumentDraft}
            busy={signingDocumentBusy}
            dirty={signingDocumentDirty}
            canEdit={holdsLock && isPartner}
            onChange={handleSigningDocumentChange}
            onSave={saveSigningDocument}
            onReset={resetSigningDocumentDraft}
          />
        ) : (
          <ActivityTimeline styles={styles} activity={activity} />
        )}
      </main>
    </>
  );
}
