import {
  getNotificationsForViewer,
  markNotificationReadByViewer,
} from "../../lib/auditTasksStore";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const viewerName =
      typeof req.query.viewerName === "string" ? req.query.viewerName : "";
    const data = await getNotificationsForViewer(viewerName);
    res.status(200).json(data);
    return;
  }

  if (req.method === "POST") {
    const { action, notificationId, viewerName } = req.body || {};
    if (action !== "mark_read") {
      res.status(400).json({ error: "Invalid action." });
      return;
    }
    if (
      (typeof notificationId !== "string" && typeof notificationId !== "number") ||
      String(notificationId).trim() === ""
    ) {
      res.status(400).json({ error: "Missing or invalid notificationId." });
      return;
    }
    const result = await markNotificationReadByViewer(
      String(notificationId),
      typeof viewerName === "string" ? viewerName : ""
    );
    if (!result.ok) {
      res.status(result.status || 400).json({ error: result.error });
      return;
    }
    res.status(200).json({ notification: result.notification });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
