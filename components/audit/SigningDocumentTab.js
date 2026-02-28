function formatTodayLong() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SigningDocumentTab({
  styles,
  selectedCompany,
  value,
  busy,
  dirty,
  canEdit,
  onChange,
  onSave,
  onReset,
}) {
  return (
    <div style={styles.card}>
      <div style={styles.signingToolbar}>
        <div>
          <h3 style={styles.signingTitle}>Signing document</h3>
          <p style={styles.signingSubtitle}>
            Partner-only draft for final sign-off. Looks like a document and is editable.
          </p>
        </div>
        <div style={styles.signingToolbarActions}>
          <button
            type="button"
            style={styles.signingGhostButton}
            onClick={onReset}
            disabled={busy || !canEdit || !dirty}
          >
            Reset changes
          </button>
          <button
            type="button"
            style={styles.signingPrimaryButton}
            onClick={onSave}
            disabled={busy || !canEdit || !dirty}
          >
            {busy ? "Saving..." : "Save document"}
          </button>
        </div>
      </div>

      <div style={styles.signingPaperWrap}>
        <div style={styles.signingPaperHeader}>
          <div style={styles.signingPaperTitle}>Audit Sign-Off Memorandum</div>
          <div style={styles.signingPaperMeta}>
            <span>
              Company: <strong>{selectedCompany?.name || "-"}</strong>
            </span>
            <span>
              Org no: <strong>{selectedCompany?.organizationNumber || "-"}</strong>
            </span>
            <span>Date: {formatTodayLong()}</span>
          </div>
        </div>

        <textarea
          style={styles.signingEditor}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!canEdit || busy}
          rows={20}
        />
      </div>

      {!canEdit && (
        <p style={styles.signingLockHint}>
          Only a partner with the company lock can edit the signing document.
        </p>
      )}
    </div>
  );
}
