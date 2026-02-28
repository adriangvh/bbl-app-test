export default function StatusSelect({ value, onChange, disabled, styles }) {
  const map = {
    Completed: { bg: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    "Needs review": { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    "In progress": { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    Blocked: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  };
  const s = map[value] || { bg: "#f3f4f6", border: "#e5e7eb", text: "#111827" };

  return (
    <div style={{ ...styles.statusSelectWrap, background: s.bg, borderColor: s.border }}>
      <select
        style={{
          ...styles.statusSelect,
          color: s.text,
          opacity: disabled ? 0.65 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-label="Task status"
      >
        <option>Completed</option>
        <option>Needs review</option>
        <option>In progress</option>
        <option>Blocked</option>
      </select>
      <span style={{ ...styles.statusChevron, color: s.text }} aria-hidden="true">
        v
      </span>
    </div>
  );
}
