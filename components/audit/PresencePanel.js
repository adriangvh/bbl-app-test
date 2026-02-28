function formatPresenceTime(iso) {
  if (!iso) {
    return "-";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleTimeString();
}

function prettifyTab(tab) {
  if (tab === "audit_tasks") {
    return "Audit tasks";
  }
  if (tab === "risk_responsibility") {
    return "Risk & responsibility";
  }
  if (tab === "activity") {
    return "Activity";
  }
  return tab || "-";
}

export default function PresencePanel({ styles, presence, actorId }) {
  return (
    <div style={styles.presencePanel}>
      <div style={styles.presenceHeader}>
        <span style={styles.presenceTitle}>Live viewers</span>
        <span style={styles.presenceCount}>{presence.length}</span>
      </div>
      {presence.length === 0 ? (
        <div style={styles.presenceEmpty}>No one else is viewing this company.</div>
      ) : (
        <div style={styles.presenceList}>
          {presence.map((person) => (
            <div key={person.actorId} style={styles.presenceItem}>
              <div style={styles.presenceNameRow}>
                <span style={styles.presenceName}>
                  {person.actorName}
                  {person.actorId === actorId ? " (You)" : ""}
                </span>
                <span style={styles.presenceRole}>{person.actorRole}</span>
              </div>
              <div style={styles.presenceMeta}>
                <span>{prettifyTab(person.activeTab)}</span>
                <span>•</span>
                <span>{formatPresenceTime(person.lastSeenAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
