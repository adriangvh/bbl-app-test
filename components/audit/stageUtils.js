export function getStageChipStyle(stage) {
  const palette = {
    "First time auditing": {
      background: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    "First time review": {
      background: "#fffbeb",
      border: "#fde68a",
      color: "#92400e",
    },
    "Second time review": {
      background: "#ecfeff",
      border: "#a5f3fc",
      color: "#0f766e",
    },
    "Partner review": {
      background: "#f5f3ff",
      border: "#ddd6fe",
      color: "#6d28d9",
    },
    Signing: {
      background: "#ecfdf5",
      border: "#bbf7d0",
      color: "#166534",
    },
  };
  return palette[stage] || {
    background: "#f3f4f6",
    border: "#d1d5db",
    color: "#374151",
  };
}
