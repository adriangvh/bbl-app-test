const QUESTIONS = [
  { key: "overall_risk_assessed", label: "Overall risk assessed?" },
  { key: "fraud_risk_documented", label: "Fraud risk documented?" },
  { key: "controls_tested", label: "Key controls tested?" },
  { key: "partner_review_ready", label: "Ready for partner review?" },
];

export default function RiskResponsibilityTab({
  styles,
  selectedCompany,
  responses,
  onResponseChange,
  canEdit,
}) {
  return (
    <div style={styles.card}>
      <div style={styles.riskHeader}>
        <h3 style={styles.riskTitle}>Risk & responsibility</h3>
        <span style={styles.riskSubtitle}>Company level overview</span>
      </div>
      <div style={styles.riskGrid}>
        <div style={styles.riskItem}>
          <span style={styles.infoLabel}>Inherent risk</span>
          <span style={styles.infoValue}>Medium</span>
        </div>
        <div style={styles.riskItem}>
          <span style={styles.infoLabel}>Control environment</span>
          <span style={styles.infoValue}>Needs review</span>
        </div>
        <div style={styles.riskItem}>
          <span style={styles.infoLabel}>Responsible partner</span>
          <span style={styles.infoValue}>{selectedCompany?.responsiblePartner || "-"}</span>
        </div>
        <div style={styles.riskItem}>
          <span style={styles.infoLabel}>Current stage</span>
          <span style={styles.infoValue}>{selectedCompany?.auditStage || "-"}</span>
        </div>
      </div>
      <div style={styles.riskSummaryBox}>
        <span style={styles.infoLabel}>Summary</span>
        <p style={styles.riskSummaryText}>
          Capture key risks, ownership, and follow-up responsibilities for this company in this
          view.
        </p>
      </div>
      <div style={styles.riskChecklist}>
        <span style={styles.infoLabel}>Checklist (Yes / No)</span>
        <div style={styles.riskChecklistGrid}>
          {QUESTIONS.map((question) => {
            const answer = responses?.[question.key] || "";
            return (
              <div key={question.key} style={styles.riskQuestionRow}>
                <span style={styles.riskQuestionText}>{question.label}</span>
                <div style={styles.riskToggleGroup}>
                  <button
                    type="button"
                    style={{
                      ...styles.riskToggleButton,
                      ...(answer === "yes" ? styles.riskToggleYesActive : {}),
                    }}
                    disabled={!canEdit}
                    onClick={() => onResponseChange(question.key, "yes")}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.riskToggleButton,
                      ...(answer === "no" ? styles.riskToggleNoActive : {}),
                    }}
                    disabled={!canEdit}
                    onClick={() => onResponseChange(question.key, "no")}
                  >
                    No
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {!canEdit && (
          <p style={styles.riskLockHint}>
            Claim the company lock to edit risk and responsibility answers.
          </p>
        )}
      </div>
      <div style={styles.note}>This tab is scoped for risk and responsibility tracking.</div>
    </div>
  );
}
