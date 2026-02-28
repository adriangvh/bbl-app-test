import StatusSelect from "./StatusSelect";

export default function AuditTasksTab({
  styles,
  taskQuery,
  statusFilter,
  onTaskQueryChange,
  onStatusFilterChange,
  actorName,
  onActorNameChange,
  actorId,
  actorRole,
  lock,
  holdsLock,
  lockBusy,
  selectedCompanyId,
  onUpdateLock,
  error,
  loading,
  filteredRows,
  canEdit,
  onStatusChange,
  onCommentChange,
  onCommentBlur,
  onCommentInput,
  savingById,
}) {
  const lockedByOther = Boolean(lock && lock.actorId !== actorId);
  const canForceRelease =
    lockedByOther && (actorRole === "manager" || actorRole === "partner");

  return (
    <div style={styles.card}>
      <div style={styles.toolbar}>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <input
            placeholder="Search tasks…"
            style={styles.input}
            value={taskQuery}
            onChange={onTaskQueryChange}
          />
          <select style={styles.select} value={statusFilter} onChange={onStatusFilterChange}>
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="needs review">Needs review</option>
            <option value="in progress">In progress</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>
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

      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Task no.</th>
              <th style={styles.th}>Task</th>
              <th style={styles.th}>Task description</th>
              <th style={styles.th}>Robot processed</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Comment</th>
              <th style={styles.th}>Evidence / output</th>
              <th style={styles.th}>Last updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr style={styles.tr}>
                <td style={styles.td} colSpan={8}>
                  Loading tasks...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr style={styles.tr}>
                <td style={styles.td} colSpan={8}>
                  No tasks match your filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.tdMono}>{r.taskNumber || "-"}</td>
                  <td style={styles.tdStrong}>{r.task}</td>
                  <td style={styles.td}>{r.description}</td>
                  <td style={styles.td}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: r.robotProcessed ? "#10b981" : "#9ca3af",
                        }}
                      />
                      {r.robotProcessed ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <StatusSelect
                      value={r.status}
                      disabled={!canEdit}
                      onChange={(e) => onStatusChange(r.id, e.target.value)}
                      styles={styles}
                    />
                  </td>
                  <td style={styles.tdComment}>
                    <textarea
                      style={styles.rowTextarea}
                      value={r.comment}
                      placeholder="Add comment"
                      disabled={!canEdit}
                      onChange={(e) => onCommentChange(r.id, e.target.value)}
                      onInput={onCommentInput}
                      onBlur={() => onCommentBlur(r.id)}
                      rows={3}
                    />
                  </td>
                  <td style={styles.td}>{r.evidence}</td>
                  <td style={styles.tdMono}>
                    {r.lastUpdated}
                    <span style={styles.savingSlot}>{savingById[r.id] ? " saving..." : ""}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.note}>
        Data is persisted per company in a local file-backed database via `/api/audit-tasks`.
      </div>
    </div>
  );
}
