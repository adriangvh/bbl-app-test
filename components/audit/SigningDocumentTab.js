import { useEffect, useRef } from "react";

function formatTodayLong() {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isHtmlContent(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
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
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const incoming = String(value || "");
    const asHtml = isHtmlContent(incoming) ? incoming : incoming.replace(/\n/g, "<br>");
    if (editor.innerHTML !== asHtml && document.activeElement !== editor) {
      editor.innerHTML = asHtml;
    }
  }, [value]);

  function runCommand(command) {
    if (!canEdit || busy) {
      return;
    }
    editorRef.current?.focus();
    try {
      document.execCommand(command, false);
    } catch {
      // Best-effort rich text command.
    }
    onChange(editorRef.current?.innerHTML || "");
  }

  function handleEditorInput() {
    onChange(editorRef.current?.innerHTML || "");
  }

  function handleEditorPaste(event) {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    try {
      document.execCommand("insertText", false, text);
    } catch {
      const editor = editorRef.current;
      if (editor) {
        editor.innerText += text;
      }
    }
    onChange(editorRef.current?.innerHTML || "");
  }

  return (
    <div style={styles.card}>
      <div style={styles.signingToolbar}>
        <div>
          <h3 style={styles.signingTitle}>Signing document</h3>
          <p style={styles.signingSubtitle}>
            Partner-only draft for final sign-off. PDF-style editing workspace.
          </p>
        </div>
        <div style={styles.signingEditorTools}>
          <button
            type="button"
            style={styles.signingToolButton}
            onClick={() => runCommand("bold")}
            disabled={!canEdit || busy}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            style={{ ...styles.signingToolButton, fontStyle: "italic" }}
            onClick={() => runCommand("italic")}
            disabled={!canEdit || busy}
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            style={{ ...styles.signingToolButton, textDecoration: "underline" }}
            onClick={() => runCommand("underline")}
            disabled={!canEdit || busy}
            title="Underline"
          >
            U
          </button>
          <button
            type="button"
            style={styles.signingToolButton}
            onClick={() => runCommand("insertUnorderedList")}
            disabled={!canEdit || busy}
            title="Bullet list"
          >
            List
          </button>
          <button
            type="button"
            style={styles.signingToolButton}
            onClick={() => runCommand("justifyCenter")}
            disabled={!canEdit || busy}
            title="Center"
          >
            Center
          </button>
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

      <div className="signing-page-wrap" style={styles.signingPaperWrap}>
        <div className="signing-a4-page" style={styles.signingPage}>
          <div style={styles.signingPaperHeader}>
            <div style={styles.signingPaperTitle}>Audit Sign-Off</div>
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

          <div style={styles.signingPaperBody}>
            <div
              ref={editorRef}
              style={styles.signingEditor}
              contentEditable={canEdit && !busy}
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onPaste={handleEditorPaste}
            />
          </div>

          <div style={styles.signingPaperFooter}>Page 1 of 1</div>
        </div>
      </div>

      {!canEdit && (
        <p style={styles.signingLockHint}>
          Only a partner with the company lock can edit the signing document.
        </p>
      )}
      <style jsx global>{`
        @page {
          size: A4;
          margin: 18mm 16mm 18mm 16mm;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .signing-page-wrap,
          .signing-page-wrap * {
            visibility: visible;
          }
          .signing-page-wrap {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0 !important;
            border: none !important;
            background: #fff !important;
          }
          .signing-a4-page {
            width: auto !important;
            min-height: auto !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
