import {
  getAuditCompaniesOverview,
  updateCompanyDueDate,
} from "../../lib/auditTasksStore";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const data = await getAuditCompaniesOverview();
    res.status(200).json(data);
    return;
  }

  if (req.method === "PATCH") {
    const { companyId, dueDate, actorRole, actorId, actorName } = req.body || {};
    if (!companyId || typeof companyId !== "string") {
      res.status(400).json({ error: "Missing or invalid companyId." });
      return;
    }
    const result = await updateCompanyDueDate(
      companyId,
      dueDate ?? null,
      actorRole,
      actorId,
      actorName
    );
    if (!result.ok) {
      res.status(result.status || 400).json({ error: result.error });
      return;
    }
    res.status(200).json({ company: result.company });
    return;
  }

  res.setHeader("Allow", "GET, PATCH");
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
