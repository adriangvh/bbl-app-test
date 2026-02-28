import {
  advanceCompanyStage,
  claimCompanyLock,
  getAuditData,
  releaseCompanyLock,
  renewCompanyLock,
  updateTask,
} from "../../lib/auditTasksStore";

const allowedStatuses = new Set([
  "Completed",
  "Needs review",
  "In progress",
  "Blocked",
]);

export default async function handler(req, res) {
  if (req.method === "GET") {
    const companyId =
      typeof req.query.companyId === "string" ? req.query.companyId : undefined;
    const data = await getAuditData(companyId);
    res.status(200).json(data);
    return;
  }

  if (req.method === "PATCH") {
    const { companyId, id, status, comment, actorId } = req.body || {};

    if (!companyId || typeof companyId !== "string") {
      res.status(400).json({ error: "Missing or invalid companyId." });
      return;
    }

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Missing or invalid id." });
      return;
    }
    if (!actorId || typeof actorId !== "string") {
      res.status(400).json({ error: "Missing or invalid actorId." });
      return;
    }

    const patch = {};

    if (status !== undefined) {
      if (typeof status !== "string" || !allowedStatuses.has(status)) {
        res.status(400).json({ error: "Invalid status." });
        return;
      }
      patch.status = status;
    }

    if (comment !== undefined) {
      if (typeof comment !== "string") {
        res.status(400).json({ error: "Invalid comment." });
        return;
      }
      patch.comment = comment;
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "No fields to update." });
      return;
    }

    const result = await updateTask(companyId, id, patch, actorId);

    if (!result.ok) {
      res.status(result.status || 400).json({ error: result.error, lock: result.lock || null });
      return;
    }

    res.status(200).json({ task: result.task, lock: result.lock || null });
    return;
  }

  if (req.method === "POST") {
    const { companyId, actorId, actorName, action } = req.body || {};

    if (!companyId || typeof companyId !== "string") {
      res.status(400).json({ error: "Missing or invalid companyId." });
      return;
    }
    if (!actorId || typeof actorId !== "string") {
      res.status(400).json({ error: "Missing or invalid actorId." });
      return;
    }
    if (!action || typeof action !== "string") {
      res.status(400).json({ error: "Missing or invalid action." });
      return;
    }

    let result;
    if (action === "claim") {
      if (!actorName || typeof actorName !== "string" || actorName.trim().length < 2) {
        res.status(400).json({ error: "Provide a valid name to claim lock." });
        return;
      }
      result = await claimCompanyLock(companyId, actorId, actorName.trim());
    } else if (action === "renew") {
      result = await renewCompanyLock(companyId, actorId);
    } else if (action === "release") {
      result = await releaseCompanyLock(companyId, actorId);
    } else if (action === "advance_stage") {
      result = await advanceCompanyStage(companyId, actorId);
    } else {
      res.status(400).json({ error: "Invalid action." });
      return;
    }

    if (!result.ok) {
      res.status(result.status || 400).json({ error: result.error, lock: result.lock || null });
      return;
    }

    res.status(200).json({
      lock: result.lock || null,
      company: result.company || null,
    });
    return;
  }

  res.setHeader("Allow", "GET, PATCH, POST");
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
