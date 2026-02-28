const companyGroups = ["Group A", "Group B", "Group C", "Group D", "Group E"];
const organizationTypes = [
  "Limited Company",
  "Public Company",
  "Foundation",
  "Municipality",
  "Branch",
];
const responsiblePartners = [
  "Alex Johnson",
  "Sofia Berg",
  "Mikkel Hansen",
  "Emily Carter",
  "Luca Rossi",
  "Noah Patel",
];
const reviewStages = [
  "First time auditing",
  "First time review",
  "Second time review",
  "Partner review",
];
const auditStages = [
  ...reviewStages,
  "Signing",
];

const taskNumberSequence = (() => {
  const sequence = [];
  for (let i = 1; i <= 40; i += 1) {
    sequence.push(String(i));
    if (i === 1) {
      sequence.push("1.1");
    }
    if (i === 8) {
      sequence.push("8.1");
      sequence.push("8.2");
    }
  }
  return sequence;
})();

const seededTaskDefinitions = {
  "1": {
    task: "Invoice match",
    description: "Match invoice to PO and goods receipt.",
    evidence: "3-way match report",
    robotProcessed: true,
  },
  "1.1": {
    task: "Vendor validation",
    description: "Validate vendor master data completeness.",
    evidence: "Master data exceptions list",
    robotProcessed: true,
  },
  "2": {
    task: "Journal sampling",
    description: "Select sample of manual journals for testing.",
    evidence: "Sampling plan v1",
    robotProcessed: false,
  },
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)."
    );
  }

  return {
    baseUrl: `${url.replace(/\/$/, "")}/rest/v1`,
    key,
  };
}

async function restRequest(table, options = {}) {
  const {
    method = "GET",
    select,
    filters = [],
    body,
    order,
    limit,
    onConflict,
    prefer,
  } = options;

  const { baseUrl, key } = getSupabaseConfig();
  const params = new URLSearchParams();

  if (select) {
    params.set("select", select);
  }
  if (order) {
    params.set("order", order);
  }
  if (typeof limit === "number") {
    params.set("limit", String(limit));
  }
  if (onConflict) {
    params.set("on_conflict", onConflict);
  }

  filters.forEach((filter) => {
    params.append(filter.column, `${filter.op}.${filter.value}`);
  });

  const url = `${baseUrl}/${table}${params.toString() ? `?${params.toString()}` : ""}`;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let parsed = null;

  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!response.ok) {
    const message =
      (parsed && typeof parsed === "object" && (parsed.message || parsed.error)) ||
      `Supabase request failed (${response.status})`;
    throw new Error(message);
  }

  return parsed;
}

function buildOrganizationNumber(index) {
  return `900${String(index).padStart(6, "0")}`;
}

function buildDefaultCompanies() {
  const companies = [
    {
      id: "acme-corp",
      name: "Acme Corp",
      group: "Group A",
      organizationNumber: buildOrganizationNumber(1),
      organizationType: organizationTypes[0],
      responsiblePartner: responsiblePartners[0],
      auditStage: auditStages[0],
    },
    {
      id: "globex-inc",
      name: "Globex Inc",
      group: "Group A",
      organizationNumber: buildOrganizationNumber(2),
      organizationType: organizationTypes[1],
      responsiblePartner: responsiblePartners[1],
      auditStage: auditStages[1],
    },
    {
      id: "initech-ltd",
      name: "Initech Ltd",
      group: "Group A",
      organizationNumber: buildOrganizationNumber(3),
      organizationType: organizationTypes[0],
      responsiblePartner: responsiblePartners[2],
      auditStage: auditStages[2],
    },
  ];

  for (let i = 4; i <= 50; i += 1) {
    const groupIndex = Math.floor((i - 1) / 10);
    const group = companyGroups[Math.min(groupIndex, companyGroups.length - 1)];
    const number = String(i).padStart(2, "0");
    companies.push({
      id: `company-${number}`,
      name: `Company ${number}`,
      group,
      organizationNumber: buildOrganizationNumber(i),
      organizationType: organizationTypes[(i - 1) % organizationTypes.length],
      responsiblePartner: responsiblePartners[(i - 1) % responsiblePartners.length],
      auditStage: auditStages[(i - 1) % auditStages.length],
    });
  }

  return companies;
}

function buildFakeTaskDefinition(taskNumber, index) {
  const verbs = [
    "Review",
    "Assess",
    "Validate",
    "Inspect",
    "Reconcile",
    "Confirm",
    "Document",
    "Test",
  ];
  const areas = [
    "revenue recognition controls",
    "cash and bank reconciliations",
    "procurement approvals",
    "payroll change management",
    "access management logs",
    "intercompany eliminations",
    "inventory valuation support",
    "financial close checklist",
  ];
  const outputs = [
    "control walkthrough notes",
    "evidence index",
    "exception tracker",
    "supporting schedule",
    "sample test sheet",
    "reconciliation pack",
  ];

  const verb = verbs[index % verbs.length];
  const area = areas[index % areas.length];

  return {
    task: `${verb} procedure ${taskNumber}`,
    description: `${verb} ${area} and document findings in the audit file.`,
    evidence: outputs[index % outputs.length],
    robotProcessed: index % 3 !== 0,
  };
}

function buildSeedTasks(companyId, variant) {
  const statusMap = {
    0: "Completed",
    1: "In progress",
    2: "Needs review",
    3: "Blocked",
  };

  return taskNumberSequence.map((taskNumber, index) => {
    const definition =
      seededTaskDefinitions[taskNumber] || buildFakeTaskDefinition(taskNumber, index);

    return {
      id: `${companyId}-task-${taskNumber.replace(/\./g, "-")}`,
      companyId,
      taskNumber,
      task: definition.task,
      description: definition.description,
      robotProcessed: definition.robotProcessed,
      status: statusMap[(variant + index) % 4],
      comment: "",
      evidence: definition.evidence,
      lastUpdated: "2026-02-28",
    };
  });
}

function toCompanyRow(company) {
  return {
    id: company.id,
    name: company.name,
    company_group: company.group,
    organization_number: company.organizationNumber,
    organization_type: company.organizationType,
    responsible_partner: company.responsiblePartner,
    audit_stage: company.auditStage,
    overall_risk_assessed: company.overallRiskAssessed ?? null,
    fraud_risk_documented: company.fraudRiskDocumented ?? null,
    controls_tested: company.controlsTested ?? null,
    partner_review_ready: company.partnerReviewReady ?? null,
    task_due_date: company.taskDueDate ?? null,
  };
}

function fromCompanyRow(row) {
  return {
    id: row.id,
    name: row.name,
    group: row.company_group,
    organizationNumber: row.organization_number,
    organizationType: row.organization_type,
    responsiblePartner: row.responsible_partner,
    auditStage: row.audit_stage || auditStages[0],
    overallRiskAssessed: row.overall_risk_assessed ?? null,
    fraudRiskDocumented: row.fraud_risk_documented ?? null,
    controlsTested: row.controls_tested ?? null,
    partnerReviewReady: row.partner_review_ready ?? null,
    taskDueDate: row.task_due_date || null,
  };
}

function toTaskRow(task) {
  return {
    id: task.id,
    company_id: task.companyId,
    task_number: task.taskNumber,
    task: task.task,
    description: task.description,
    robot_processed: task.robotProcessed,
    status: task.status,
    comment: task.comment,
    evidence: task.evidence,
    last_updated: task.lastUpdated,
  };
}

function fromTaskRow(row) {
  return {
    id: row.id,
    taskNumber: row.task_number,
    task: row.task,
    description: row.description,
    robotProcessed: row.robot_processed,
    status: row.status,
    comment: row.comment || "",
    evidence: row.evidence || "",
    lastUpdated: row.last_updated,
  };
}

function fromActivityRow(row) {
  return {
    id: String(row.id),
    companyId: row.company_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    eventType: row.event_type,
    message: row.message,
    createdAt: row.created_at,
  };
}

function fromPresenceRow(row) {
  return {
    companyId: row.company_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    activeTab: row.active_tab,
    lastSeenAt: row.last_seen_at,
  };
}

function fromLockRow(row) {
  if (!row) {
    return null;
  }
  return {
    actorId: row.actor_id,
    actorName: row.actor_name,
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

function getNextAuditStage(currentStage) {
  const index = reviewStages.indexOf(currentStage);
  if (index === -1 || index >= reviewStages.length - 1) {
    return null;
  }
  return reviewStages[index + 1];
}

async function seedIfEmpty() {
  if (seedIfEmpty.done) {
    return;
  }

  const companies = await restRequest("audit_companies", {
    method: "GET",
    select: "id",
    limit: 1,
  });

  if (Array.isArray(companies) && companies.length > 0) {
    seedIfEmpty.done = true;
    return;
  }

  const defaultCompanies = buildDefaultCompanies();
  await restRequest("audit_companies", {
    method: "POST",
    body: defaultCompanies.map(toCompanyRow),
    prefer: "return=minimal",
  });

  const taskRows = defaultCompanies.flatMap((company, index) =>
    buildSeedTasks(company.id, index).map(toTaskRow)
  );

  const chunkSize = 500;
  for (let i = 0; i < taskRows.length; i += chunkSize) {
    await restRequest("audit_tasks", {
      method: "POST",
      body: taskRows.slice(i, i + chunkSize),
      prefer: "return=minimal",
    });
  }

  seedIfEmpty.done = true;
}
seedIfEmpty.done = false;

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function compareTaskNumber(a, b) {
  const aParts = String(a || "").split(".").map((part) => Number(part));
  const bParts = String(b || "").split(".").map((part) => Number(part));
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const aValue = Number.isFinite(aParts[i]) ? aParts[i] : 0;
    const bValue = Number.isFinite(bParts[i]) ? bParts[i] : 0;
    if (aValue !== bValue) {
      return aValue - bValue;
    }
  }

  return 0;
}

function getNowIso() {
  return new Date().toISOString();
}

function normalizeActorRole(role) {
  const raw = String(role || "").trim().toLowerCase();
  const compact = raw.replace(/[^a-z]/g, "");

  if (compact.includes("partner")) {
    return "partner";
  }
  if (compact.includes("manager")) {
    return "manager";
  }
  if (compact.includes("auditor")) {
    return "auditor";
  }

  return null;
}

function getLockExpiryIso() {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString();
}

async function pruneExpiredLocks() {
  await restRequest("audit_locks", {
    method: "DELETE",
    filters: [{ column: "expires_at", op: "lte", value: getNowIso() }],
    prefer: "return=minimal",
  });
}

async function getActiveLock(companyId) {
  const rows = await restRequest("audit_locks", {
    method: "GET",
    select: "company_id,actor_id,actor_name,expires_at",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "expires_at", op: "gt", value: getNowIso() },
    ],
    limit: 1,
  });

  return fromLockRow(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
}

async function getAllActiveLocks() {
  const rows = await restRequest("audit_locks", {
    method: "GET",
    select: "company_id,actor_id,actor_name,expires_at",
    filters: [{ column: "expires_at", op: "gt", value: getNowIso() }],
  });

  const map = new Map();
  (rows || []).forEach((row) => {
    map.set(row.company_id, fromLockRow(row));
  });

  return map;
}

function getPresenceStaleIso() {
  return new Date(Date.now() - 75 * 1000).toISOString();
}

async function pruneStalePresence() {
  await restRequest("audit_presence", {
    method: "DELETE",
    filters: [{ column: "last_seen_at", op: "lt", value: getPresenceStaleIso() }],
    prefer: "return=minimal",
  });
}

async function getCompanyPresence(companyId) {
  const rows = await restRequest("audit_presence", {
    method: "GET",
    select: "company_id,actor_id,actor_name,actor_role,active_tab,last_seen_at",
    filters: [{ column: "company_id", op: "eq", value: companyId }],
    order: "last_seen_at.desc",
  });
  return (rows || []).map(fromPresenceRow);
}

async function upsertLock(companyId, actorId, actorName) {
  const rows = await restRequest("audit_locks", {
    method: "POST",
    onConflict: "company_id",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      company_id: companyId,
      actor_id: actorId,
      actor_name: actorName,
      expires_at: getLockExpiryIso(),
    },
  });

  return fromLockRow(Array.isArray(rows) ? rows[0] : rows);
}

async function logActivity(companyId, actorId, actorName, eventType, message) {
  if (!companyId || !actorId || !eventType || !message) {
    return;
  }
  try {
    await restRequest("audit_activity_events", {
      method: "POST",
      body: {
        company_id: companyId,
        actor_id: actorId,
        actor_name: actorName || "Unknown user",
        event_type: eventType,
        message,
      },
      prefer: "return=minimal",
    });
  } catch (error) {
    if (!String(error?.message || "").includes("audit_activity_events")) {
      throw error;
    }
  }
}

function getRiskFieldLabel(field) {
  const labels = {
    overall_risk_assessed: "Overall risk assessed",
    fraud_risk_documented: "Fraud risk documented",
    controls_tested: "Key controls tested",
    partner_review_ready: "Ready for partner review",
  };
  return labels[field] || field;
}

function summarizeComment(text, limit = 180) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "(empty)";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 1)}...`;
}

function normalizeNameKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function buildViewerNameKeys(name) {
  const key = normalizeNameKey(name);
  if (!key) {
    return [];
  }
  const firstToken = key.split(".")[0];
  const noDots = key.replace(/\./g, "");
  return Array.from(new Set([key, firstToken, noDots].filter(Boolean)));
}

function extractMentionTokens(text) {
  const source = String(text || "");
  const matches = source.match(/@([a-zA-Z0-9._-]+)/g) || [];
  return Array.from(
    new Set(
      matches
        .map((token) => token.slice(1))
        .map((token) => normalizeNameKey(token))
        .filter(Boolean)
    )
  );
}

function fromDiscussionRow(row) {
  return {
    id: String(row.id),
    taskId: row.task_id,
    authorActorId: row.author_actor_id,
    authorName: row.author_name,
    message: row.message,
    createdAt: row.created_at,
  };
}

function fromNotificationRow(row) {
  return {
    id: String(row.id),
    companyId: row.company_id,
    taskId: row.task_id,
    recipientName: row.recipient_name,
    senderName: row.sender_name,
    type: row.notification_type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function fromAuditUserRow(row) {
  const label = String(row.display_name || "").trim();
  const handle = String(row.name_key || "").trim();
  return {
    actorId: row.actor_id,
    label,
    handle,
    role: row.role || "auditor",
    lastSeenAt: row.last_seen_at || null,
  };
}

async function upsertAuditUser(actorId, actorName, actorRole) {
  const id = String(actorId || "").trim();
  const name = String(actorName || "").trim();
  if (!id || name.length < 2) {
    return;
  }
  const role = normalizeActorRole(actorRole) || "auditor";
  const nameKey = normalizeNameKey(name);
  if (!nameKey) {
    return;
  }
  try {
    await restRequest("audit_users", {
      method: "POST",
      onConflict: "actor_id",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        actor_id: id,
        display_name: name,
        name_key: nameKey,
        role,
        last_seen_at: getNowIso(),
      },
    });
  } catch (error) {
    if (!String(error?.message || "").includes("audit_users")) {
      throw error;
    }
  }
}

async function getMentionDirectoryUsers() {
  let rows = [];
  try {
    rows = await restRequest("audit_users", {
      method: "GET",
      select: "actor_id,display_name,name_key,role,last_seen_at",
      order: "display_name.asc",
      limit: 500,
    });
  } catch (error) {
    if (!String(error?.message || "").includes("audit_users")) {
      throw error;
    }
    rows = [];
  }

  return (rows || [])
    .map(fromAuditUserRow)
    .filter((user) => user.label.length > 0 && user.handle.length > 0);
}

export async function getAuditData(companyId, viewerName) {
  await seedIfEmpty();
  await pruneExpiredLocks();
  try {
    await pruneStalePresence();
  } catch (error) {
    if (!String(error?.message || "").includes("audit_presence")) {
      throw error;
    }
  }

  const companyRows = await restRequest("audit_companies", {
    method: "GET",
    select:
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage,overall_risk_assessed,fraud_risk_documented,controls_tested,partner_review_ready,task_due_date",
    order: "name.asc",
  });

  const companies = (companyRows || []).map(fromCompanyRow);
  const selectedCompanyId =
    (companyId && companies.some((company) => company.id === companyId) && companyId) ||
    companies[0]?.id;

  const taskRows = selectedCompanyId
    ? await restRequest("audit_tasks", {
        method: "GET",
        select:
          "id,company_id,task_number,task,description,robot_processed,status,comment,evidence,last_updated",
        filters: [{ column: "company_id", op: "eq", value: selectedCompanyId }],
        order: "task_number.asc",
      })
    : [];
  let discussionRows = [];
  if (selectedCompanyId) {
    try {
      discussionRows = await restRequest("audit_task_discussions", {
        method: "GET",
        select: "id,task_id,author_actor_id,author_name,message,created_at",
        filters: [{ column: "company_id", op: "eq", value: selectedCompanyId }],
        order: "created_at.asc",
        limit: 1000,
      });
    } catch (error) {
      if (!String(error?.message || "").includes("audit_task_discussions")) {
        throw error;
      }
      discussionRows = [];
    }
  }

  let activityRows = [];
  if (selectedCompanyId) {
    try {
      activityRows = await restRequest("audit_activity_events", {
        method: "GET",
        select: "id,company_id,actor_id,actor_name,event_type,message,created_at",
        filters: [{ column: "company_id", op: "eq", value: selectedCompanyId }],
        order: "created_at.desc",
        limit: 120,
      });
    } catch (error) {
      if (!String(error?.message || "").includes("audit_activity_events")) {
        throw error;
      }
      activityRows = [];
    }
  }

  const lock = selectedCompanyId ? await getActiveLock(selectedCompanyId) : null;
  let notificationsRows = [];
  if (selectedCompanyId) {
    try {
      notificationsRows = await restRequest("audit_notifications", {
        method: "GET",
        select:
          "id,company_id,task_id,recipient_name,recipient_name_key,sender_name,notification_type,message,is_read,created_at,read_at",
        filters: [{ column: "company_id", op: "eq", value: selectedCompanyId }],
        order: "created_at.desc",
        limit: 200,
      });
    } catch (error) {
      if (!String(error?.message || "").includes("audit_notifications")) {
        throw error;
      }
      notificationsRows = [];
    }
  }
  const viewerKeys = buildViewerNameKeys(viewerName);
  const notifications = (notificationsRows || [])
    .filter((row) => {
      if (viewerKeys.length === 0) {
        return false;
      }
      return viewerKeys.includes(normalizeNameKey(row.recipient_name_key || row.recipient_name));
    })
    .map(fromNotificationRow);
  let presence = [];
  if (selectedCompanyId) {
    try {
      presence = await getCompanyPresence(selectedCompanyId);
    } catch (error) {
      if (!String(error?.message || "").includes("audit_presence")) {
        throw error;
      }
      presence = [];
    }
  }
  const mentionUsers = await getMentionDirectoryUsers();

  return {
    companies,
    selectedCompanyId,
    company: companies.find((company) => company.id === selectedCompanyId) || null,
    tasks: (taskRows || [])
      .map(fromTaskRow)
      .sort((a, b) => compareTaskNumber(a.taskNumber, b.taskNumber)),
    activity: (activityRows || []).map(fromActivityRow),
    discussions: (discussionRows || []).map(fromDiscussionRow),
    notifications,
    presence,
    mentionUsers,
    lock,
  };
}

export async function getAuditCompaniesOverview() {
  await seedIfEmpty();
  await pruneExpiredLocks();

  const [companyRows, taskRows, lockMap] = await Promise.all([
    restRequest("audit_companies", {
      method: "GET",
      select:
        "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage,overall_risk_assessed,fraud_risk_documented,controls_tested,partner_review_ready,task_due_date",
      order: "name.asc",
    }),
    restRequest("audit_tasks", {
      method: "GET",
      select: "company_id",
    }),
    getAllActiveLocks(),
  ]);

  const taskCountMap = new Map();
  (taskRows || []).forEach((row) => {
    taskCountMap.set(row.company_id, (taskCountMap.get(row.company_id) || 0) + 1);
  });

  const companies = (companyRows || []).map((row) => {
    const company = fromCompanyRow(row);
    return {
      ...company,
      taskCount: taskCountMap.get(company.id) || 0,
      lock: lockMap.get(company.id) || null,
    };
  });

  return { companies };
}

export async function advanceCompanyStage(companyId, actorId, actorRole) {
  await pruneExpiredLocks();

  const normalizedRole = normalizeActorRole(actorRole) || "auditor";

  const activeLock = await getActiveLock(companyId);
  if (!activeLock || activeLock.actorId !== actorId) {
    return {
      ok: false,
      status: 423,
      error: "Company is locked by another user or not locked.",
      lock: activeLock,
    };
  }

  const companyRows = await restRequest("audit_companies", {
    method: "GET",
    select:
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage,overall_risk_assessed,fraud_risk_documented,controls_tested,partner_review_ready,task_due_date",
    filters: [{ column: "id", op: "eq", value: companyId }],
    limit: 1,
  });

  if (!Array.isArray(companyRows) || companyRows.length === 0) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  const current = fromCompanyRow(companyRows[0]);
  if (current.auditStage === "Signing") {
    return {
      ok: false,
      status: 400,
      error: "Company is already in signing.",
      company: current,
      lock: activeLock,
    };
  }
  if (current.auditStage === "Partner review") {
    return {
      ok: false,
      status: 400,
      error: "Partner review is the final review stage. Use send to signing.",
      company: current,
      lock: activeLock,
    };
  }
  if (
    normalizedRole === "auditor" &&
    current.auditStage !== "First time auditing"
  ) {
    return {
      ok: false,
      status: 403,
      error: "Auditors can only move from First time auditing to First time review.",
      company: current,
      lock: activeLock,
    };
  }

  const nextStage = getNextAuditStage(current.auditStage);
  if (!nextStage) {
    return {
      ok: false,
      status: 400,
      error: "Company is already at final review stage.",
      company: current,
      lock: activeLock,
    };
  }

  const updatedRows = await restRequest("audit_companies", {
    method: "PATCH",
    filters: [{ column: "id", op: "eq", value: companyId }],
    body: { audit_stage: nextStage },
    prefer: "return=representation",
  });
  await logActivity(
    companyId,
    actorId,
    activeLock.actorName,
    "stage_change",
    `Moved stage from "${current.auditStage}" to "${nextStage}".`
  );

  return {
    ok: true,
    company: fromCompanyRow(Array.isArray(updatedRows) ? updatedRows[0] : updatedRows),
    lock: activeLock,
  };
}

export async function sendCompanyToSigning(companyId, actorId, actorRole) {
  await pruneExpiredLocks();

  const normalizedRole = normalizeActorRole(actorRole);
  if (normalizedRole !== "partner") {
    return {
      ok: false,
      status: 403,
      error: "Only partners can send a company to signing.",
    };
  }

  const activeLock = await getActiveLock(companyId);
  if (!activeLock || activeLock.actorId !== actorId) {
    return {
      ok: false,
      status: 423,
      error: "Company is locked by another user or not locked.",
      lock: activeLock,
    };
  }

  const companyRows = await restRequest("audit_companies", {
    method: "GET",
    select:
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage,overall_risk_assessed,fraud_risk_documented,controls_tested,partner_review_ready,task_due_date",
    filters: [{ column: "id", op: "eq", value: companyId }],
    limit: 1,
  });

  if (!Array.isArray(companyRows) || companyRows.length === 0) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  const current = fromCompanyRow(companyRows[0]);
  if (current.auditStage === "Signing") {
    return {
      ok: false,
      status: 400,
      error: "Company is already in signing.",
      company: current,
      lock: activeLock,
    };
  }
  if (current.auditStage !== "Partner review") {
    return {
      ok: false,
      status: 400,
      error: "Only companies in Partner review can be sent to signing.",
      company: current,
      lock: activeLock,
    };
  }

  const updatedRows = await restRequest("audit_companies", {
    method: "PATCH",
    filters: [{ column: "id", op: "eq", value: companyId }],
    body: { audit_stage: "Signing" },
    prefer: "return=representation",
  });
  await logActivity(
    companyId,
    actorId,
    activeLock.actorName,
    "stage_signing",
    `Accepted company and sent to "Signing" from "${current.auditStage}".`
  );

  return {
    ok: true,
    company: fromCompanyRow(Array.isArray(updatedRows) ? updatedRows[0] : updatedRows),
    lock: activeLock,
  };
}

export async function claimCompanyLock(companyId, actorId, actorName) {
  await seedIfEmpty();
  await pruneExpiredLocks();
  await upsertAuditUser(actorId, actorName, null);

  const activeLock = await getActiveLock(companyId);
  if (activeLock && activeLock.actorId !== actorId) {
    return { ok: false, status: 423, error: "Company is already locked.", lock: activeLock };
  }

  const lock = await upsertLock(companyId, actorId, actorName);
  return { ok: true, lock };
}

export async function renewCompanyLock(companyId, actorId) {
  await pruneExpiredLocks();

  const activeLock = await getActiveLock(companyId);
  if (!activeLock || activeLock.actorId !== actorId) {
    return { ok: false, status: 423, error: "You do not hold this company lock." };
  }

  const lock = await upsertLock(companyId, actorId, activeLock.actorName);
  return { ok: true, lock };
}

export async function releaseCompanyLock(companyId, actorId) {
  await pruneExpiredLocks();

  const activeLock = await getActiveLock(companyId);
  if (!activeLock) {
    return { ok: true, lock: null };
  }

  if (activeLock.actorId !== actorId) {
    return {
      ok: false,
      status: 423,
      error: "Only lock holder can release lock.",
      lock: activeLock,
    };
  }

  await restRequest("audit_locks", {
    method: "DELETE",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "actor_id", op: "eq", value: actorId },
    ],
    prefer: "return=minimal",
  });

  return { ok: true, lock: null };
}

export async function forceReleaseCompanyLock(companyId, actorRole) {
  await pruneExpiredLocks();

  const normalizedRole = normalizeActorRole(actorRole);
  if (normalizedRole !== "manager" && normalizedRole !== "partner") {
    return {
      ok: false,
      status: 403,
      error: "Only managers or partners can release other users' locks.",
    };
  }

  const activeLock = await getActiveLock(companyId);
  if (!activeLock) {
    return { ok: true, lock: null };
  }

  await restRequest("audit_locks", {
    method: "DELETE",
    filters: [{ column: "company_id", op: "eq", value: companyId }],
    prefer: "return=minimal",
  });

  return { ok: true, lock: null };
}

export async function updateTask(companyId, id, patch, actorId) {
  await pruneExpiredLocks();

  const activeLock = await getActiveLock(companyId);
  if (!activeLock || activeLock.actorId !== actorId) {
    return {
      ok: false,
      status: 423,
      error: "Company is locked by another user or not locked.",
      lock: activeLock,
    };
  }

  const existingRows = await restRequest("audit_tasks", {
    method: "GET",
    select: "id,task_number,status,comment",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "id", op: "eq", value: id },
    ],
    limit: 1,
  });
  const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null;

  const patchRow = {
    ...("status" in patch ? { status: patch.status } : {}),
    ...("comment" in patch ? { comment: patch.comment } : {}),
    ...("evidence" in patch ? { evidence: patch.evidence } : {}),
    last_updated: getTodayIso(),
  };

  const rows = await restRequest("audit_tasks", {
    method: "PATCH",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "id", op: "eq", value: id },
    ],
    body: patchRow,
    prefer: "return=representation",
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, status: 404, error: "Task or company not found." };
  }

  if (existing) {
    if ("status" in patch && existing.status !== patch.status) {
      await logActivity(
        companyId,
        actorId,
        activeLock.actorName,
        "task_status",
        `Task ${existing.task_number}: status changed from "${existing.status}" to "${patch.status}".`
      );
    }
    if ("comment" in patch && existing.comment !== patch.comment) {
      await logActivity(
        companyId,
        actorId,
        activeLock.actorName,
        "task_comment",
        `Task ${existing.task_number}: comment updated to "${summarizeComment(
          patch.comment
        )}".`
      );
    }
  }

  return { ok: true, task: fromTaskRow(rows[0]), lock: activeLock };
}

export async function updateCompanyRiskChecklist(companyId, actorId, field, value) {
  await pruneExpiredLocks();

  const activeLock = await getActiveLock(companyId);
  if (!activeLock || activeLock.actorId !== actorId) {
    return {
      ok: false,
      status: 423,
      error: "Company is locked by another user or not locked.",
      lock: activeLock,
    };
  }

  const allowedFields = new Set([
    "overall_risk_assessed",
    "fraud_risk_documented",
    "controls_tested",
    "partner_review_ready",
  ]);

  if (!allowedFields.has(field)) {
    return { ok: false, status: 400, error: "Invalid risk checklist field." };
  }

  if (typeof value !== "boolean") {
    return { ok: false, status: 400, error: "Risk checklist value must be boolean." };
  }

  const companyRowsBefore = await restRequest("audit_companies", {
    method: "GET",
    select:
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage,overall_risk_assessed,fraud_risk_documented,controls_tested,partner_review_ready,task_due_date",
    filters: [{ column: "id", op: "eq", value: companyId }],
    limit: 1,
  });
  const before =
    Array.isArray(companyRowsBefore) && companyRowsBefore.length > 0
      ? fromCompanyRow(companyRowsBefore[0])
      : null;

  const rows = await restRequest("audit_companies", {
    method: "PATCH",
    filters: [{ column: "id", op: "eq", value: companyId }],
    body: { [field]: value },
    prefer: "return=representation",
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  const updatedCompany = fromCompanyRow(rows[0]);
  const beforeValue = before
    ? {
        overall_risk_assessed: before.overallRiskAssessed,
        fraud_risk_documented: before.fraudRiskDocumented,
        controls_tested: before.controlsTested,
        partner_review_ready: before.partnerReviewReady,
      }[field]
    : null;
  if (beforeValue !== value) {
    await logActivity(
      companyId,
      actorId,
      activeLock.actorName,
      "risk_checklist",
      `${getRiskFieldLabel(field)}: set to "${value ? "Yes" : "No"}".`
    );
  }

  return {
    ok: true,
    company: updatedCompany,
    lock: activeLock,
  };
}

export async function updateCompanyDueDate(
  companyId,
  dueDate,
  actorRole,
  actorId,
  actorName
) {
  const normalizedRole = normalizeActorRole(actorRole);
  if (normalizedRole !== "manager" && normalizedRole !== "partner") {
    return {
      ok: false,
      status: 403,
      error: "Only managers or partners can set due dates.",
    };
  }

  if (dueDate !== null && dueDate !== "") {
    if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return { ok: false, status: 400, error: "Invalid due date format." };
    }
  }

  const rows = await restRequest("audit_companies", {
    method: "PATCH",
    filters: [{ column: "id", op: "eq", value: companyId }],
    body: { task_due_date: dueDate || null },
    prefer: "return=representation",
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  await logActivity(
    companyId,
    actorId || "unknown",
    actorName || "Unknown user",
    "company_due_date",
    dueDate
      ? `Set company due date to ${dueDate}.`
      : "Cleared company due date."
  );

  return {
    ok: true,
    company: fromCompanyRow(rows[0]),
  };
}

export async function getDashboardSummary() {
  await seedIfEmpty();
  await pruneExpiredLocks();

  const [companyRows, taskRows, lockMap, activityRows] = await Promise.all([
    restRequest("audit_companies", {
      method: "GET",
      select:
        "id,audit_stage,partner_review_ready,task_due_date",
    }),
    restRequest("audit_tasks", {
      method: "GET",
      select: "company_id,status",
    }),
    getAllActiveLocks(),
    restRequest("audit_activity_events", {
      method: "GET",
      select: "company_id,event_type,created_at",
      filters: [{ column: "event_type", op: "in", value: "(stage_change,stage_signing)" }],
      order: "created_at.asc",
      limit: 5000,
    }).catch((error) => {
      if (!String(error?.message || "").includes("audit_activity_events")) {
        throw error;
      }
      return [];
    }),
  ]);

  const companies = (companyRows || []).map(fromCompanyRow);
  const today = getTodayIso();
  const stageDistribution = {};

  companies.forEach((company) => {
    stageDistribution[company.auditStage] = (stageDistribution[company.auditStage] || 0) + 1;
  });

  const overdueCompanyIds = new Set(
    companies
      .filter(
        (company) =>
          company.taskDueDate &&
          company.taskDueDate < today &&
          company.auditStage !== "Signing"
      )
      .map((company) => company.id)
  );

  let overdueTasks = 0;
  (taskRows || []).forEach((task) => {
    if (overdueCompanyIds.has(task.company_id) && task.status !== "Completed") {
      overdueTasks += 1;
    }
  });

  const signingReadyCount = companies.filter(
    (company) => company.auditStage === "Partner review" && company.partnerReviewReady === true
  ).length;

  const dayBuckets = [];
  const days = 30;
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const iso = date.toISOString().slice(0, 10);
    dayBuckets.push({
      date: iso,
      stageMoves: 0,
      sentToSigning: 0,
      processedTotal: 0,
    });
  }
  const bucketByDate = new Map(dayBuckets.map((bucket) => [bucket.date, bucket]));

  (activityRows || []).forEach((row) => {
    const date = String(row.created_at || "").slice(0, 10);
    const bucket = bucketByDate.get(date);
    if (!bucket) {
      return;
    }
    if (row.event_type === "stage_change") {
      bucket.stageMoves += 1;
      bucket.processedTotal += 1;
    } else if (row.event_type === "stage_signing") {
      bucket.sentToSigning += 1;
      bucket.processedTotal += 1;
    }
  });

  return {
    lockedCompanies: lockMap.size,
    overdueTasks,
    signingReadyCount,
    stageDistribution,
    processingTimeline: dayBuckets,
  };
}

export async function addTaskDiscussionComment(
  companyId,
  taskId,
  actorId,
  actorName,
  message
) {
  const trimmed = String(message || "").trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "Comment cannot be empty." };
  }
  if (!actorId || typeof actorId !== "string") {
    return { ok: false, status: 400, error: "Missing actorId." };
  }
  const safeActorName = String(actorName || "").trim() || "Unknown user";
  await upsertAuditUser(actorId, safeActorName, null);

  const taskRows = await restRequest("audit_tasks", {
    method: "GET",
    select: "id,task_number",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "id", op: "eq", value: taskId },
    ],
    limit: 1,
  });
  if (!Array.isArray(taskRows) || taskRows.length === 0) {
    return { ok: false, status: 404, error: "Task not found." };
  }
  const taskNumber = taskRows[0].task_number;

  const rows = await restRequest("audit_task_discussions", {
    method: "POST",
    prefer: "return=representation",
    body: {
      company_id: companyId,
      task_id: taskId,
      author_actor_id: actorId,
      author_name: safeActorName,
      message: trimmed,
    },
  });
  const inserted = Array.isArray(rows) ? rows[0] : rows;

  await logActivity(
    companyId,
    actorId,
    safeActorName,
    "task_discussion",
    `Task ${taskNumber}: discussion comment added: "${summarizeComment(trimmed, 140)}".`
  );

  const mentionKeys = extractMentionTokens(trimmed).filter(
    (key) => key !== normalizeNameKey(safeActorName)
  );
  if (mentionKeys.length > 0) {
    try {
      const mentionKeyList = `(${mentionKeys.map((key) => `"${key}"`).join(",")})`;
      const userRows = await restRequest("audit_users", {
        method: "GET",
        select: "name_key,display_name",
        filters: [{ column: "name_key", op: "in", value: mentionKeyList }],
        limit: 200,
      }).catch((error) => {
        if (!String(error?.message || "").includes("audit_users")) {
          throw error;
        }
        return [];
      });
      const userMap = new Map(
        (userRows || []).map((row) => [normalizeNameKey(row.name_key), String(row.display_name || "").trim()])
      );
      await restRequest("audit_notifications", {
        method: "POST",
        prefer: "return=minimal",
        body: mentionKeys.map((mentionKey) => ({
          company_id: companyId,
          task_id: taskId,
          recipient_name: userMap.get(mentionKey) || mentionKey,
          recipient_name_key: mentionKey,
          sender_name: safeActorName,
          notification_type: "mention",
          message: `You were mentioned on task ${taskNumber}: "${summarizeComment(
            trimmed,
            140
          )}"`,
          is_read: false,
        })),
      });
    } catch (error) {
      if (!String(error?.message || "").includes("audit_notifications")) {
        throw error;
      }
    }
  }

  return { ok: true, comment: fromDiscussionRow(inserted), lock: null };
}

export async function markNotificationRead(companyId, notificationId, viewerName) {
  const rows = await restRequest("audit_notifications", {
    method: "GET",
    select:
      "id,company_id,task_id,recipient_name,recipient_name_key,sender_name,notification_type,message,is_read,created_at,read_at",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "id", op: "eq", value: notificationId },
    ],
    limit: 1,
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, status: 404, error: "Notification not found." };
  }

  const notification = rows[0];
  const viewerKeys = buildViewerNameKeys(viewerName);
  const recipientKey = normalizeNameKey(
    notification.recipient_name_key || notification.recipient_name
  );
  if (!viewerKeys.includes(recipientKey)) {
    return { ok: false, status: 403, error: "Not allowed to update this notification." };
  }

  const updated = await restRequest("audit_notifications", {
    method: "PATCH",
    filters: [
      { column: "company_id", op: "eq", value: companyId },
      { column: "id", op: "eq", value: notificationId },
    ],
    body: { is_read: true, read_at: new Date().toISOString() },
    prefer: "return=representation",
  });

  return { ok: true, notification: fromNotificationRow(updated[0]) };
}

export async function getNotificationsForViewer(viewerName) {
  const viewerKeys = buildViewerNameKeys(viewerName);
  if (viewerKeys.length === 0) {
    return { notifications: [] };
  }

  const keyList = `(${viewerKeys.map((key) => `"${key}"`).join(",")})`;
  let rows = [];
  try {
    rows = await restRequest("audit_notifications", {
      method: "GET",
      select:
        "id,company_id,task_id,recipient_name,recipient_name_key,sender_name,notification_type,message,is_read,created_at,read_at",
      filters: [
        { column: "recipient_name_key", op: "in", value: keyList },
        { column: "is_read", op: "eq", value: "false" },
      ],
      order: "created_at.desc",
      limit: 200,
    });
  } catch (error) {
    if (!String(error?.message || "").includes("audit_notifications")) {
      throw error;
    }
    return { notifications: [] };
  }

  const companyIds = Array.from(new Set((rows || []).map((row) => row.company_id))).filter(Boolean);
  let companyNameMap = new Map();
  if (companyIds.length > 0) {
    const idList = `(${companyIds.map((id) => `"${id}"`).join(",")})`;
    const companies = await restRequest("audit_companies", {
      method: "GET",
      select: "id,name",
      filters: [{ column: "id", op: "in", value: idList }],
      limit: 500,
    });
    companyNameMap = new Map((companies || []).map((company) => [company.id, company.name]));
  }

  return {
    notifications: (rows || []).map((row) => ({
      ...fromNotificationRow(row),
      companyName: companyNameMap.get(row.company_id) || row.company_id,
    })),
  };
}

export async function markNotificationReadByViewer(notificationId, viewerName) {
  const rows = await restRequest("audit_notifications", {
    method: "GET",
    select:
      "id,company_id,task_id,recipient_name,recipient_name_key,sender_name,notification_type,message,is_read,created_at,read_at",
    filters: [{ column: "id", op: "eq", value: notificationId }],
    limit: 1,
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, status: 404, error: "Notification not found." };
  }
  const notification = rows[0];
  const viewerKeys = buildViewerNameKeys(viewerName);
  const recipientKey = normalizeNameKey(
    notification.recipient_name_key || notification.recipient_name
  );
  if (!viewerKeys.includes(recipientKey)) {
    return { ok: false, status: 403, error: "Not allowed to update this notification." };
  }

  const updated = await restRequest("audit_notifications", {
    method: "PATCH",
    filters: [{ column: "id", op: "eq", value: notificationId }],
    body: { is_read: true, read_at: new Date().toISOString() },
    prefer: "return=representation",
  });
  return { ok: true, notification: fromNotificationRow(updated[0]) };
}

export async function upsertPresence(companyId, actorId, actorName, actorRole, activeTab) {
  await upsertAuditUser(actorId, actorName, actorRole);
  try {
    await pruneStalePresence();
  } catch (error) {
    if (!String(error?.message || "").includes("audit_presence")) {
      throw error;
    }
  }

  let rows;
  try {
    rows = await restRequest("audit_presence", {
      method: "POST",
      onConflict: "company_id,actor_id",
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        company_id: companyId,
        actor_id: actorId,
        actor_name: actorName || "Unknown user",
        actor_role: actorRole || "auditor",
        active_tab: activeTab || "audit_tasks",
        last_seen_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (String(error?.message || "").includes("audit_presence")) {
      return { ok: true, presence: null };
    }
    throw error;
  }

  const record = Array.isArray(rows) ? rows[0] : rows;
  return { ok: true, presence: fromPresenceRow(record) };
}

export async function removePresence(companyId, actorId) {
  try {
    await restRequest("audit_presence", {
      method: "DELETE",
      filters: [
        { column: "company_id", op: "eq", value: companyId },
        { column: "actor_id", op: "eq", value: actorId },
      ],
      prefer: "return=minimal",
    });
  } catch (error) {
    if (!String(error?.message || "").includes("audit_presence")) {
      throw error;
    }
  }
  return { ok: true };
}
