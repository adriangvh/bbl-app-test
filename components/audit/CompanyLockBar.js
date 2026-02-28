export default function CompanyLockBar({
  styles,
  actorName,
  onActorNameChange,
  actorId,
  actorRole,
  lock,
  holdsLock,
  lockBusy,
  selectedCompanyId,
  onUpdateLock,
}) {
  const lockedByOther = Boolean(lock && lock.actorId !== actorId);
  const canForceRelease =
    lockedByOther && (actorRole === "manager" || actorRole === "partner");

  return (
    <div style={styles.lockBar}>
      <input
        style={styles.nameInput}
        placeholder="Your name"
        value={actorName}
        onChange={onActorNameChange}
      />
      {holdsLock && (
        <button
          style={styles.lockButton}
          onClick={() => onUpdateLock("release")}
          disabled={lockBusy || !selectedCompanyId}
        >
          Release lock
        </button>
      )}
      {!holdsLock && canForceRelease && (
        <button
          style={{ ...styles.lockButton, ...styles.forceReleaseButton }}
          onClick={() => onUpdateLock("force_release")}
          disabled={lockBusy || !selectedCompanyId}
        >
          Release other lock
        </button>
      )}
      {!holdsLock && !lock && (
        <button
          style={styles.lockButton}
          onClick={() => onUpdateLock("claim")}
          disabled={lockBusy || !selectedCompanyId || actorName.trim().length < 2}
        >
          Claim lock
        </button>
      )}
      <span style={styles.lockText}>
        {holdsLock
          ? `Locked by you until ${new Date(lock.expiresAt).toLocaleTimeString()}`
          : lock
          ? `Locked by ${lock.actorName}`
          : "No lock active"}
      </span>
    </div>
  );
}
