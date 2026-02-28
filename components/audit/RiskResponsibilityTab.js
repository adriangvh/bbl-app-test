export default function RiskResponsibilityTab({ styles, selectedCompany }) {
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
      <div style={styles.note}>This tab is scoped for risk and responsibility tracking.</div>
    </div>
  );
}
