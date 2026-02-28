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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function exportToPdf() {
    const contentHtml = editorRef.current?.innerHTML || String(value || "");
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!popup) {
      return;
    }

    const companyName = escapeHtml(selectedCompany?.name || "-");
    const orgNo = escapeHtml(selectedCompany?.organizationNumber || "-");
    const title = `Signing Document - ${companyName}`;

    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef2f7; color: #0f172a; font-family: "Times New Roman", Georgia, serif; }
      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 10mm auto;
        background: #fff;
        border: 1px solid #dbe3f0;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.16);
        padding: 18mm 16mm;
      }
      .head { margin-bottom: 10mm; padding-bottom: 4mm; border-bottom: 1px solid #e2e8f0; }
      .title { font-weight: 700; font-size: 21px; margin-bottom: 4mm; }
      .meta { display: flex; flex-wrap: wrap; gap: 8mm; font-size: 12px; color: #334155; }
      .content { font-size: 14px; line-height: 1.7; }
      .content h2 { font-size: 17px; margin: 7mm 0 3mm; }
      .content p { margin: 0 0 3mm; }
      .content ul { margin: 0 0 3.5mm 5mm; }
      .foot { margin-top: 8mm; text-align: right; color: #64748b; font-size: 11px; }
      .print-btn {
        position: fixed; right: 16px; top: 12px;
        border-radius: 8px; border: 1px solid #2563eb; background: #2563eb; color: #fff;
        font-size: 12px; font-weight: 700; padding: 7px 10px; cursor: pointer;
      }
      @media print {
        body { background: #fff; }
        .sheet { margin: 0; border: none; box-shadow: none; width: auto; min-height: auto; padding: 0; }
        .print-btn { display: none; }
      }
    </style>
  </head>
  <body>
    <button class="print-btn" onclick="window.print()">Export / Print PDF</button>
    <article class="sheet">
      <header class="head">
        <div class="title">Audit Sign-Off Memorandum</div>
        <div class="meta">
          <span>Company: <strong>${companyName}</strong></span>
          <span>Org no: <strong>${orgNo}</strong></span>
          <span>Date: ${escapeHtml(formatTodayLong())}</span>
        </div>
      </header>
      <section class="content">${contentHtml}</section>
      <footer class="foot">Page 1 of 1</footer>
    </article>
  </body>
</html>`);
    popup.document.close();
    popup.focus();
    setTimeout(() => {
      popup.print();
    }, 300);
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
            style={styles.signingExportButton}
            onClick={exportToPdf}
          >
            Export to PDF
          </button>
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
