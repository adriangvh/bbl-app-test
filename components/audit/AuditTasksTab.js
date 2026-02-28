import { useMemo, useState } from "react";
import StatusSelect from "./StatusSelect";

export default function AuditTasksTab({
  styles,
  taskQuery,
  statusFilter,
  onTaskQueryChange,
  onStatusFilterChange,
  error,
  loading,
  filteredRows,
  canEdit,
  onStatusChange,
  onCommentChange,
  onCommentBlur,
  onCommentInput,
  savingById,
  discussions,
  onAddTaskDiscussion,
  discussionBusyByTask,
  mentionCandidates,
}) {
  const [openTaskId, setOpenTaskId] = useState("");
  const [draftByTask, setDraftByTask] = useState({});
  const [mentionQueryByTask, setMentionQueryByTask] = useState({});
  const discussionMap = useMemo(() => {
    const map = new Map();
    (discussions || []).forEach((d) => {
      const list = map.get(d.taskId) || [];
      list.push(d);
      map.set(d.taskId, list);
    });
    return map;
  }, [discussions]);

  function getDraft(taskId) {
    return draftByTask[taskId] || "";
  }

  function getMentionQuery(taskId, text) {
    const source = String(text || "");
    const match = source.match(/@([a-zA-Z0-9._-]{0,50})$/);
    return match ? match[1].toLowerCase() : "";
  }

  function setDraft(taskId, text) {
    setDraftByTask((prev) => ({ ...prev, [taskId]: text }));
    setMentionQueryByTask((prev) => ({ ...prev, [taskId]: getMentionQuery(taskId, text) }));
  }

  function applyMention(taskId, handle) {
    const source = getDraft(taskId);
    const next = source.replace(/@([a-zA-Z0-9._-]{0,50})$/, `@${handle} `);
    setDraft(taskId, next);
  }

  async function submitDiscussion(taskId) {
    const text = getDraft(taskId).trim();
    if (!text) {
      return;
    }
    const ok = await onAddTaskDiscussion(taskId, text);
    if (ok) {
      setDraftByTask((prev) => ({ ...prev, [taskId]: "" }));
      setMentionQueryByTask((prev) => ({ ...prev, [taskId]: "" }));
    }
  }

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
              <th style={styles.th}>Discussion</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr style={styles.tr}>
                <td style={styles.td} colSpan={9}>
                  Loading tasks...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr style={styles.tr}>
                <td style={styles.td} colSpan={9}>
                  No tasks match your filters.
                </td>
              </tr>
            ) : (
              filteredRows.flatMap((r) => {
                const isOpen = openTaskId === r.id;
                const taskDiscussions = discussionMap.get(r.id) || [];
                return [
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
                    <td style={styles.td}>
                      {r.evidence}
                    </td>
                    <td style={styles.tdMono}>
                      {r.lastUpdated}
                      <span style={styles.savingSlot}>{savingById[r.id] ? " saving..." : ""}</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.discussionToggleButton}
                        onClick={() => setOpenTaskId(isOpen ? "" : r.id)}
                      >
                        {isOpen ? "Hide thread" : `Open thread (${taskDiscussions.length})`}
                      </button>
                    </td>
                  </tr>,
                  isOpen ? (
                    <tr key={`${r.id}-discussion`} style={styles.tr}>
                      <td style={styles.tdDiscussionWrap} colSpan={9}>
                        <div style={styles.discussionPanel}>
                          <div style={styles.discussionList}>
                            {taskDiscussions.length === 0 ? (
                              <div style={styles.discussionEmpty}>No discussion yet.</div>
                            ) : (
                              taskDiscussions.map((d) => (
                                <div key={d.id} style={styles.discussionItem}>
                                  <div style={styles.discussionMeta}>
                                    {d.authorName} • {new Date(d.createdAt).toLocaleString()}
                                  </div>
                                  <div style={styles.discussionMessage}>{d.message}</div>
                                </div>
                              ))
                            )}
                          </div>
                          <div style={styles.discussionComposer}>
                            <textarea
                              style={styles.discussionTextarea}
                              placeholder="Add discussion comment. Mention with @name"
                              value={getDraft(r.id)}
                              onChange={(e) => setDraft(r.id, e.target.value)}
                              rows={2}
                            />
                            {mentionQueryByTask[r.id] && (
                              <div style={styles.mentionSuggestions}>
                                {(mentionCandidates || [])
                                  .filter((candidate) =>
                                    candidate.handle
                                      .toLowerCase()
                                      .includes(mentionQueryByTask[r.id].toLowerCase())
                                  )
                                  .slice(0, 6)
                                  .map((candidate) => (
                                    <button
                                      key={candidate.handle}
                                      type="button"
                                      style={styles.mentionSuggestionItem}
                                      onClick={() => applyMention(r.id, candidate.handle)}
                                    >
                                      @{candidate.handle}
                                      <span style={styles.mentionSuggestionName}>
                                        {candidate.label}
                                      </span>
                                    </button>
                                  ))}
                              </div>
                            )}
                            <button
                              type="button"
                              style={styles.discussionSendButton}
                              disabled={Boolean(discussionBusyByTask[r.id])}
                              onClick={() => submitDiscussion(r.id)}
                            >
                              {discussionBusyByTask[r.id] ? "Posting..." : "Post"}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ];
              })
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
