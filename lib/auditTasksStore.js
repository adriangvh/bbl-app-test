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

export async function getAuditData(companyId) {
  await seedIfEmpty();
  await pruneExpiredLocks();

  const companyRows = await restRequest("audit_companies", {
    method: "GET",
    select:
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage",
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

  const lock = selectedCompanyId ? await getActiveLock(selectedCompanyId) : null;

  return {
    companies,
    selectedCompanyId,
    company: companies.find((company) => company.id === selectedCompanyId) || null,
    tasks: (taskRows || [])
      .map(fromTaskRow)
      .sort((a, b) => compareTaskNumber(a.taskNumber, b.taskNumber)),
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
        "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage",
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
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage",
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
      "id,name,company_group,organization_number,organization_type,responsible_partner,audit_stage",
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

  return {
    ok: true,
    company: fromCompanyRow(Array.isArray(updatedRows) ? updatedRows[0] : updatedRows),
    lock: activeLock,
  };
}

export async function claimCompanyLock(companyId, actorId, actorName) {
  await seedIfEmpty();
  await pruneExpiredLocks();

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

  return { ok: true, task: fromTaskRow(rows[0]), lock: activeLock };
}
