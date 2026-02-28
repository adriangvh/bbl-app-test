import { getStageChipStyle } from "./stageUtils";

export default function CompanyInfoCard({
  styles,
  selectedCompany,
  showNextStageButton,
  showSendToSigningButton,
  stagePressed,
  stageBusy,
  stageJustAdvanced,
  signingPressed,
  signingBusy,
  canUseNextStage,
  canSendToSigning,
  onAdvanceStage,
  onSendToSigning,
  onStageMouseDown,
  onStageMouseUp,
  onStageMouseLeave,
  onSigningMouseDown,
  onSigningMouseUp,
  onSigningMouseLeave,
}) {
  return (
    <section style={styles.companyInfoCard}>
      <div style={styles.companyInfoHeader}>
        <h2 style={styles.companyInfoTitle}>Company Information</h2>
        <div style={styles.stageButtons}>
          {showNextStageButton && (
            <button
              style={{
                ...styles.nextStageButton,
                ...(stagePressed ? styles.nextStageButtonPressed : {}),
                ...(stageBusy ? styles.nextStageButtonBusy : {}),
                ...(stageJustAdvanced ? styles.nextStageButtonDone : {}),
              }}
              disabled={!canUseNextStage || stageBusy}
              onClick={onAdvanceStage}
              onMouseDown={onStageMouseDown}
              onMouseUp={onStageMouseUp}
              onMouseLeave={onStageMouseLeave}
            >
              {stageBusy ? "Sending to next stage..." : "Send to next stage"}
            </button>
          )}
          {showSendToSigningButton && (
            <button
              style={{
                ...styles.signingButton,
                ...(signingPressed ? styles.signingButtonPressed : {}),
                ...(signingBusy ? styles.signingButtonBusy : {}),
              }}
              disabled={!canSendToSigning || signingBusy}
              onClick={onSendToSigning}
              onMouseDown={onSigningMouseDown}
              onMouseUp={onSigningMouseUp}
              onMouseLeave={onSigningMouseLeave}
            >
              {signingBusy ? "Sending to signing..." : "Accept and send to signing"}
            </button>
          )}
        </div>
      </div>
      <div style={styles.companyInfoGrid}>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>company_name</span>
          <span style={styles.infoValue}>{selectedCompany?.name || "-"}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>organization_type</span>
          <span style={styles.infoValue}>{selectedCompany?.organizationType || "-"}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>responsible_partner</span>
          <span style={styles.infoValue}>{selectedCompany?.responsiblePartner || "-"}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>company_group</span>
          <span style={styles.infoValue}>{selectedCompany?.group || "-"}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>organization_number</span>
          <span style={styles.infoValue}>{selectedCompany?.organizationNumber || "-"}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>audit_stage</span>
          <span style={styles.infoValue}>
            {selectedCompany?.auditStage ? (
              <span
                style={{
                  ...styles.stageChip,
                  ...getStageChipStyle(selectedCompany.auditStage),
                }}
              >
                {selectedCompany.auditStage}
              </span>
            ) : (
              "-"
            )}
          </span>
        </div>
      </div>
    </section>
  );
}
