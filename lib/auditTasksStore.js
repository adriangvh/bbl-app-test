import { promises as fs } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "audit-tasks.json");
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

function buildOrganizationNumber(index) {
  return `900${String(index).padStart(6, "0")}`;
}

function deriveOrganizationNumberFromId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000000;
  }
  return buildOrganizationNumber(hash);
}

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

function buildDefaultCompanies() {
  const companies = [
    {
      id: "acme-corp",
      name: "Acme Corp",
      group: "Group A",
      organizationNumber: buildOrganizationNumber(1),
      organizationType: organizationTypes[0],
      responsiblePartner: responsiblePartners[0],
    },
    {
      id: "globex-inc",
      name: "Globex Inc",
      group: "Group A",
      organizationNumber: buildOrganizationNumber(2),
      organizationType: organizationTypes[1],
      responsiblePartner: responsiblePartners[1],
    },
    {
      id: "initech-ltd",
      name: "Initech Ltd",
      group: "Group A",
      organizationNumber: buildOrganizationNumber(3),
      organizationType: organizationTypes[0],
      responsiblePartner: responsiblePartners[2],
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
    });
  }

  return companies;
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

function reconcileCompanyTasks(existingTasks, companyId, variant) {
  const seedTasks = buildSeedTasks(companyId, variant);
  if (!Array.isArray(existingTasks) || existingTasks.length === 0) {
    return seedTasks;
  }

  const byTaskNumber = new Map(
    existingTasks
      .filter((task) => typeof task.taskNumber === "string")
      .map((task) => [task.taskNumber, task])
  );
  const byTaskName = new Map(
    existingTasks
      .filter((task) => typeof task.task === "string")
      .map((task) => [task.task, task])
  );

  return seedTasks.map((seedTask) => {
    const existing =
      byTaskNumber.get(seedTask.taskNumber) || byTaskName.get(seedTask.task);

    if (!existing) {
      return seedTask;
    }

    return {
      ...seedTask,
      status: typeof existing.status === "string" ? existing.status : seedTask.status,
      comment: typeof existing.comment === "string" ? existing.comment : seedTask.comment,
      evidence: typeof existing.evidence === "string" ? existing.evidence : seedTask.evidence,
      lastUpdated:
        typeof existing.lastUpdated === "string"
          ? existing.lastUpdated
          : seedTask.lastUpdated,
    };
  });
}

const defaultCompanies = buildDefaultCompanies();

function buildDefaultTasksByCompany() {
  return defaultCompanies.reduce((accumulator, company, index) => {
    accumulator[company.id] = buildSeedTasks(company.id, index);
    return accumulator;
  }, {});
}

function getDefaultCompanyMap() {
  return new Map(defaultCompanies.map((company) => [company.id, company]));
}

const defaultStore = {
  companies: defaultCompanies,
  tasksByCompany: buildDefaultTasksByCompany(),
  locksByCompany: {},
};

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getNowMs() {
  return Date.now();
}

function getLockExpiryMs() {
  return getNowMs() + 10 * 60 * 1000;
}

function cloneDefaultStore() {
  return JSON.parse(JSON.stringify(defaultStore));
}

function normalizeStore(input) {
  if (Array.isArray(input)) {
    const migrated = cloneDefaultStore();
    migrated.tasksByCompany["acme-corp"] = reconcileCompanyTasks(input, "acme-corp", 0);
    return migrated;
  }

  if (!input || typeof input !== "object") {
    return cloneDefaultStore();
  }

  const defaultCompanyMap = getDefaultCompanyMap();
  const inputCompanies = Array.isArray(input.companies) ? input.companies : [];
  const mergedInputCompanies = inputCompanies.map((company, index) => {
    const fallback = defaultCompanyMap.get(company.id);
    return {
      id: company.id,
      name: company.name,
      group: company.group || fallback?.group || companyGroups[index % companyGroups.length],
      organizationNumber:
        company.organizationNumber ||
        fallback?.organizationNumber ||
        deriveOrganizationNumberFromId(company.id),
      organizationType:
        company.organizationType ||
        fallback?.organizationType ||
        organizationTypes[index % organizationTypes.length],
      responsiblePartner:
        company.responsiblePartner ||
        fallback?.responsiblePartner ||
        responsiblePartners[index % responsiblePartners.length],
    };
  });

  const existingIds = new Set(mergedInputCompanies.map((company) => company.id));
  const missingDefaults = defaultCompanies.filter((company) => !existingIds.has(company.id));
  const companies = [...mergedInputCompanies, ...missingDefaults];

  const rawTasksByCompany =
    input.tasksByCompany && typeof input.tasksByCompany === "object"
      ? input.tasksByCompany
      : {};

  const tasksByCompany = { ...rawTasksByCompany };
  companies.forEach((company, index) => {
    tasksByCompany[company.id] = reconcileCompanyTasks(
      tasksByCompany[company.id],
      company.id,
      index
    );
  });

  const locksByCompany =
    input.locksByCompany && typeof input.locksByCompany === "object"
      ? input.locksByCompany
      : {};

  return { companies, tasksByCompany, locksByCompany };
}

function getActiveLock(locksByCompany, companyId) {
  const lock = locksByCompany[companyId];
  if (!lock) {
    return null;
  }
  if (typeof lock.expiresAt !== "number" || lock.expiresAt <= getNowMs()) {
    return null;
  }
  return lock;
}

function pruneExpiredLocks(store) {
  const nextLocks = { ...store.locksByCompany };
  let mutated = false;

  Object.keys(nextLocks).forEach((companyId) => {
    const lock = nextLocks[companyId];
    if (!lock || typeof lock.expiresAt !== "number" || lock.expiresAt <= getNowMs()) {
      delete nextLocks[companyId];
      mutated = true;
    }
  });

  if (!mutated) {
    return store;
  }

  return {
    ...store,
    locksByCompany: nextLocks,
  };
}

async function ensureDataFile() {
  try {
    await fs.access(dataFile);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = pruneExpiredLocks(normalizeStore(parsed));

  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    await fs.writeFile(dataFile, JSON.stringify(normalized, null, 2), "utf8");
  }

  return normalized;
}

async function writeStore(store) {
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

export async function getAuditData(companyId) {
  const store = await readStore();
  const selectedCompanyId =
    (companyId && store.companies.some((company) => company.id === companyId) && companyId) ||
    store.companies[0]?.id;

  return {
    companies: store.companies,
    selectedCompanyId,
    company: store.companies.find((company) => company.id === selectedCompanyId) || null,
    tasks: store.tasksByCompany[selectedCompanyId] || [],
    lock: getActiveLock(store.locksByCompany, selectedCompanyId),
  };
}

export async function getAuditCompaniesOverview() {
  const store = await readStore();

  const companies = store.companies.map((company) => {
    const tasks = store.tasksByCompany[company.id] || [];
    const lock = getActiveLock(store.locksByCompany, company.id);

    return {
      id: company.id,
      name: company.name,
      group: company.group || companyGroups[0],
      organizationNumber: company.organizationNumber || "",
      organizationType: company.organizationType || "",
      responsiblePartner: company.responsiblePartner || "",
      taskCount: tasks.length,
      lock,
    };
  });

  return { companies };
}

export async function claimCompanyLock(companyId, actorId, actorName) {
  const store = await readStore();
  const companyExists = store.companies.some((company) => company.id === companyId);
  if (!companyExists) {
    return { ok: false, status: 404, error: "Company not found." };
  }

  const activeLock = getActiveLock(store.locksByCompany, companyId);
  if (activeLock && activeLock.actorId !== actorId) {
    return { ok: false, status: 423, error: "Company is already locked.", lock: activeLock };
  }

  const nextLock = {
    actorId,
    actorName,
    expiresAt: getLockExpiryMs(),
  };

  store.locksByCompany[companyId] = nextLock;
  await writeStore(store);
  return { ok: true, lock: nextLock };
}

export async function renewCompanyLock(companyId, actorId) {
  const store = await readStore();
  const activeLock = getActiveLock(store.locksByCompany, companyId);

  if (!activeLock || activeLock.actorId !== actorId) {
    return { ok: false, status: 423, error: "You do not hold this company lock." };
  }

  const nextLock = {
    ...activeLock,
    expiresAt: getLockExpiryMs(),
  };
  store.locksByCompany[companyId] = nextLock;
  await writeStore(store);
  return { ok: true, lock: nextLock };
}

export async function releaseCompanyLock(companyId, actorId) {
  const store = await readStore();
  const activeLock = getActiveLock(store.locksByCompany, companyId);

  if (!activeLock) {
    return { ok: true, lock: null };
  }

  if (activeLock.actorId !== actorId) {
    return { ok: false, status: 423, error: "Only lock holder can release lock.", lock: activeLock };
  }

  delete store.locksByCompany[companyId];
  await writeStore(store);
  return { ok: true, lock: null };
}

export async function updateTask(companyId, id, patch, actorId) {
  const store = await readStore();
  const tasks = store.tasksByCompany[companyId];

  if (!tasks) {
    return { ok: false, status: 404, error: "Task or company not found." };
  }

  const activeLock = getActiveLock(store.locksByCompany, companyId);
  if (!activeLock || activeLock.actorId !== actorId) {
    return {
      ok: false,
      status: 423,
      error: "Company is locked by another user or not locked.",
      lock: activeLock,
    };
  }

  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return { ok: false, status: 404, error: "Task or company not found." };
  }

  const updated = {
    ...tasks[index],
    ...patch,
    lastUpdated: getTodayIso(),
  };

  tasks[index] = updated;
  store.tasksByCompany[companyId] = tasks;
  await writeStore(store);
  return { ok: true, task: updated, lock: activeLock };
}
