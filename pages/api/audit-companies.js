import { getAuditCompaniesOverview } from "../../lib/auditTasksStore";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  const data = await getAuditCompaniesOverview();
  res.status(200).json(data);
}
