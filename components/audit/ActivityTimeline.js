function formatTime(iso) {
  if (!iso) {
    return "-";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export default function ActivityTimeline({ styles, activity }) {
  return (
    <div style={styles.card}>
      <div style={styles.timelineHeader}>
        <h3 style={styles.timelineTitle}>Activity timeline</h3>
        <span style={styles.timelineSubtitle}>Who changed what and when</span>
      </div>
      <div style={styles.timelineList}>
        {activity.length === 0 ? (
          <div style={styles.timelineEmpty}>No activity logged yet.</div>
        ) : (
          activity.map((event) => (
            <div key={event.id} style={styles.timelineItem}>
              <div style={styles.timelineDot} aria-hidden="true" />
              <div style={styles.timelineContent}>
                <div style={styles.timelineMessage}>{event.message}</div>
                <div style={styles.timelineMeta}>
                  <span style={styles.timelineActor}>{event.actorName}</span>
                  <span>•</span>
                  <span>{formatTime(event.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
