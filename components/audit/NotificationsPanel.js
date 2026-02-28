function formatNotificationTime(iso) {
  if (!iso) {
    return "-";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString();
}

export default function NotificationsPanel({
  styles,
  notifications,
  onMarkRead,
  markBusyById,
}) {
  return (
    <div style={styles.notificationsPanel}>
      <div style={styles.notificationsHeader}>
        <span style={styles.notificationsTitle}>Mentions & notifications</span>
        <span style={styles.notificationsCount}>{notifications.length}</span>
      </div>
      {notifications.length === 0 ? (
        <div style={styles.notificationsEmpty}>No unread notifications.</div>
      ) : (
        <div style={styles.notificationsList}>
          {notifications.map((notification) => (
            <div key={notification.id} style={styles.notificationItem}>
              <div style={styles.notificationMessage}>{notification.message}</div>
              <div style={styles.notificationMeta}>
                <span>From {notification.senderName}</span>
                <span>•</span>
                <span>{formatNotificationTime(notification.createdAt)}</span>
              </div>
              <button
                type="button"
                style={styles.notificationReadButton}
                disabled={Boolean(markBusyById[notification.id])}
                onClick={() => onMarkRead(notification.id)}
              >
                {markBusyById[notification.id] ? "Saving..." : "Mark as read"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
