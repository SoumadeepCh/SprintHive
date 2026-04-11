"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────── */
type User = { id: number; name: string };
type Label = { id: number; name: string; color: string };
type Comment = { id: number; content: string; createdAt: string; user: User };
type TaskLabel = { label: Label };

type Task = {
    id: number; key?: string | null; issueType: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK"; title: string; description?: string;
    status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assignee?: User; creator: User;
    storyPoints?: number | null;
    parent?: { id: number; key?: string | null; title: string; issueType: string } | null;
    labels: TaskLabel[];
    dueDate?: string;
    _count: { comments: number };
};

type Sprint = {
    id: number; name: string; isActive: boolean;
    project: { id: number; name: string; organizationId: number };
    tasks: Task[];
};

const COLUMNS: { status: Task["status"]; label: string; cls: string; dot: string }[] = [
    { status: "TODO", label: "Todo", cls: "badge-todo", dot: "var(--todo-fg)" },
    { status: "IN_PROGRESS", label: "In Progress", cls: "badge-inprog", dot: "var(--inprog-fg)" },
    { status: "REVIEW", label: "Review", cls: "badge-review", dot: "var(--review-fg)" },
    { status: "DONE", label: "Done", cls: "badge-done", dot: "var(--done-fg)" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const ISSUE_TYPES = ["STORY", "TASK", "BUG", "EPIC", "SUBTASK"] as const;
const PRIORITY_COLORS: Record<string, string> = {
    LOW: "var(--low-fg)", MEDIUM: "var(--med-fg)", HIGH: "var(--high-fg)", URGENT: "var(--urgent-fg)",
};

/* ── Component ───────────────────────────────────────────── */
export default function SprintBoard() {
    const { id } = useParams<{ id: string }>();
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<User[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [showCreate, setShowCreate] = useState<Task["status"] | null>(null);
    const [selectedTask, setSelectedTask] = useState<number | null>(null);
    const [taskDetail, setTaskDetail] = useState<Task & { comments: Comment[]; activities?: { id: number; actorName: string; type: string; field?: string | null; fromValue?: string | null; toValue?: string | null; createdAt: string }[] } | null>(null);
    const [newComment, setNewComment] = useState("");
    const [commentUserId, setCommentUserId] = useState<number | "">("");
    const [savingComment, setSavingComment] = useState(false);

    const [createForm, setCreateForm] = useState({
        title: "", description: "", issueType: "TASK" as Task["issueType"], priority: "MEDIUM" as Task["priority"], storyPoints: "",
        assigneeId: "" as number | "", labelIds: [] as number[], dueDate: "",
    });
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const s = await fetch(`/api/sprints/${id}`).then((r) => r.json());
        setSprint(s);
        // Load members and labels using project context
        if (s?.project) {
            const [mu, ml] = await Promise.all([
                fetch(`/api/users?orgId=${s.project.organizationId}`).then((r) => r.json()),
                fetch(`/api/labels?projectId=${s.project.id}`).then((r) => r.json()),
            ]);
            setMembers(mu);
            setLabels(ml);
        }
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    // Load task detail
    useEffect(() => {
        if (!selectedTask) { setTaskDetail(null); return; }
        fetch(`/api/tasks/${selectedTask}`).then((r) => r.json()).then(setTaskDetail);
    }, [selectedTask]);

    const openCreate = (status: Task["status"]) => {
        setCreateForm({ title: "", description: "", issueType: "TASK", priority: "MEDIUM", storyPoints: "", assigneeId: "", labelIds: [], dueDate: "" });
        setShowCreate(status);
    };

    const createTask = async () => {
        if (!createForm.title || !sprint) return;
        if (members.length === 0) { alert("Add members to the organization first."); return; }
        setCreating(true);
        await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: createForm.title,
                description: createForm.description || undefined,
                sprintId: sprint.id,
                assigneeId: createForm.assigneeId || undefined,
                issueType: createForm.issueType,
                priority: createForm.priority,
                storyPoints: createForm.storyPoints ? Number(createForm.storyPoints) : undefined,
                status: showCreate,
                labelIds: createForm.labelIds,
                dueDate: createForm.dueDate || undefined,
            }),
        });
        setShowCreate(null);
        setCreating(false);
        load();
    };

    const moveTask = async (taskId: number, status: Task["status"]) => {
        setSprint((s) => s ? { ...s, tasks: s.tasks.map((t) => t.id === taskId ? { ...t, status } : t) } : s);
        await fetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
    };

    const onDropTask = (status: Task["status"], event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const taskId = Number(event.dataTransfer.getData("text/task-id"));
        if (!taskId) return;
        const task = sprint?.tasks.find((item) => item.id === taskId);
        if (!task || task.status === status) return;
        moveTask(taskId, status);
    };

    const deleteTask = async (taskId: number) => {
        setSprint((s) => s ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s);
        setSelectedTask(null);
        await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    };

    const addComment = async () => {
        if (!newComment.trim() || !selectedTask || !commentUserId) return;
        setSavingComment(true);
        const c = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newComment.trim(), taskId: selectedTask, userId: Number(commentUserId) }),
        }).then((r) => r.json());
        setTaskDetail((t) => t ? { ...t, comments: [...(t.comments || []), c] } : t);
        setNewComment("");
        setSavingComment(false);
    };

    /* ── Derived ─────────────────────────────────────────────── */
    const tasksByStatus = (status: Task["status"]) => sprint?.tasks.filter((t) => t.status === status) ?? [];

    if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading board…</div>;
    if (!sprint) return <div style={{ padding: "60px", textAlign: "center", color: "var(--danger)" }}>Sprint not found.</div>;

    const col = COLUMNS;

    return (
        <div style={{ minHeight: "100vh" }}>
            {/* Top bar */}
            <div style={{
                padding: "16px 28px", borderBottom: "1px solid var(--border)",
                background: "var(--surface)", display: "flex", alignItems: "center", gap: "16px",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                    <span>›</span>
                    <Link href={`/projects/${sprint.project.id}`} style={{ color: "var(--accent)" }}>{sprint.project.name}</Link>
                    <span>›</span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{sprint.name}</span>
                </div>
                {sprint.isActive && (
                    <span className="badge badge-done" style={{ marginLeft: "4px" }}>● ACTIVE</span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {col.map(({ status, label }) => (
                        <span key={status}>{label}: <b style={{ color: "var(--text)" }}>{tasksByStatus(status).length}</b></span>
                    ))}
                </div>
            </div>

            {/* Kanban */}
            <div className="kanban-board">
                {col.map(({ status, label, cls, dot }) => {
                    const tasks = tasksByStatus(status);
                    return (
                        <div
                            key={status}
                            className="kanban-col"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => onDropTask(status, event)}
                        >
                            {/* Column header */}
                            <div className="kanban-header" style={{ background: "var(--surface2)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dot }} />
                                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{label}</span>
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{tasks.length}</span>
                                </div>
                                <button
                                    onClick={() => openCreate(status)}
                                    style={{ fontSize: "1.1rem", color: "var(--text-muted)", padding: "2px 6px", borderRadius: "6px" }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface3)"; e.currentTarget.style.color = "var(--text)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                                    title={`Add to ${label}`}
                                >+</button>
                            </div>

                            {/* Cards */}
                            {tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="kanban-card anim-in"
                                    onClick={() => setSelectedTask(task.id)}
                                    draggable
                                    onDragStart={(event) => event.dataTransfer.setData("text/task-id", String(task.id))}
                                >
                                    {/* Priority stripe */}
                                    <div style={{ width: "3px", height: "12px", borderRadius: "2px", background: PRIORITY_COLORS[task.priority], marginBottom: "8px" }} />
                                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                                        <span style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 800 }}>{task.key ?? `#${task.id}`}</span>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{task.issueType}</span>
                                        {task.storyPoints != null && <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{task.storyPoints} pts</span>}
                                    </div>
                                    <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: "8px", lineHeight: 1.4 }}>{task.title}</div>
                                    {task.parent && (
                                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                                            Epic: {task.parent.key ?? `#${task.parent.id}`} {task.parent.title}
                                        </div>
                                    )}

                                    {/* Labels */}
                                    {task.labels.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                                            {task.labels.map(({ label }) => (
                                                <span key={label.id} style={{
                                                    padding: "1px 7px", borderRadius: "0px", fontSize: "0.7rem", fontWeight: 600,
                                                    background: `${label.color}22`, color: label.color,
                                                }}>{label.name}</span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Bottom row */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            <span className={`badge ${cls}`} style={{ fontSize: "0.65rem" }}>{task.priority}</span>
                                            {task._count.comments > 0 && (
                                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>💬 {task._count.comments}</span>
                                            )}
                                        </div>
                                        {task.assignee && (
                                            <div
                                                title={task.assignee.name}
                                                style={{
                                                    width: "24px", height: "24px", borderRadius: "50%",
                                                    background: "var(--primary)", border: "4px solid var(--border)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                                                }}>
                                                {task.assignee.name[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {tasks.length === 0 && (
                                <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", borderRadius: "var(--radius)", border: "1px dashed var(--border)" }}>
                                    No tasks here
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Create Task Modal ──────────────────────────────── */}
            {showCreate && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(null)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "20px" }}>
                            New Task · <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{showCreate.replace("_", " ")}</span>
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Title *</label>
                                <input className="input-field" placeholder="Task title…" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Description</label>
                                <textarea className="input-field" placeholder="Optional details…" rows={3} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} style={{ resize: "vertical" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Issue Type</label>
                                    <select className="input-field" value={createForm.issueType} onChange={(e) => setCreateForm((f) => ({ ...f, issueType: e.target.value as Task["issueType"] }))}>
                                        {ISSUE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Priority</label>
                                    <select className="input-field" value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as Task["priority"] }))}>
                                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Story Points</label>
                                    <input type="number" min="0" className="input-field" value={createForm.storyPoints} onChange={(e) => setCreateForm((f) => ({ ...f, storyPoints: e.target.value }))} placeholder="0" />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Assignee</label>
                                    <select className="input-field" value={createForm.assigneeId} onChange={(e) => setCreateForm((f) => ({ ...f, assigneeId: e.target.value ? Number(e.target.value) : "" }))}>
                                        <option value="">Unassigned</option>
                                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Due Date</label>
                                <input type="date" className="input-field" value={createForm.dueDate} onChange={(e) => setCreateForm((f) => ({ ...f, dueDate: e.target.value }))} />
                            </div>
                            {labels.length > 0 && (
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Labels</label>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                        {labels.map((l) => {
                                            const active = createForm.labelIds.includes(l.id);
                                            return (
                                                <button
                                                    key={l.id}
                                                    onClick={() => setCreateForm((f) => ({
                                                        ...f,
                                                        labelIds: active ? f.labelIds.filter((x) => x !== l.id) : [...f.labelIds, l.id],
                                                    }))}
                                                    style={{
                                                        padding: "3px 10px", borderRadius: "0px", fontSize: "0.75rem", fontWeight: 600,
                                                        background: active ? `${l.color}33` : "var(--surface2)",
                                                        color: active ? l.color : "var(--text-muted)",
                                                        border: active ? `1px solid ${l.color}88` : "1px solid var(--border)",
                                                        cursor: "pointer",
                                                    }}
                                                >{l.name}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowCreate(null)}>Cancel</button>
                            <button className="btn-primary" onClick={createTask} disabled={creating || !createForm.title}>
                                {creating ? "Creating…" : "Create Task"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Task Detail Modal ──────────────────────────────── */}
            {selectedTask && taskDetail && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedTask(null)}>
                    <div className="modal-box anim-modal" style={{ padding: "0" }}>
                        {/* Header */}
                        <div style={{ padding: "24px 28px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 800 }}>{taskDetail.key ?? `#${taskDetail.id}`}</span>
                                    <span className="badge badge-todo">{taskDetail.issueType}</span>
                                    <span className={`badge badge-${taskDetail.status === "IN_PROGRESS" ? "inprog" : taskDetail.status.toLowerCase()}`}>
                                        {taskDetail.status.replace("_", " ")}
                                    </span>
                                    <span className={`badge badge-${taskDetail.priority.toLowerCase()}`}>{taskDetail.priority}</span>
                                </div>
                                <h2 style={{ fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.4 }}>{taskDetail.title}</h2>
                            </div>
                            <button onClick={() => setSelectedTask(null)} style={{ color: "var(--text-muted)", fontSize: "1.2rem", padding: "4px 8px" }}>✕</button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "24px 28px", display: "grid", gridTemplateColumns: "1fr 200px", gap: "24px" }}>
                            <div>
                                {taskDetail.description && (
                                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "20px" }}>
                                        {taskDetail.description}
                                    </p>
                                )}

                                {/* Status change */}
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Move to</label>
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                        {col.map(({ status, label, cls }) => (
                                            <button
                                                key={status}
                                                disabled={taskDetail.status === status}
                                                onClick={() => { moveTask(selectedTask, status); setSelectedTask(null); }}
                                                className={`badge ${cls}`}
                                                style={{ cursor: taskDetail.status === status ? "default" : "pointer", opacity: taskDetail.status === status ? 0.5 : 1, padding: "5px 12px" }}
                                            >{label}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Labels */}
                                {taskDetail.labels.length > 0 && (
                                    <div style={{ marginBottom: "20px" }}>
                                        <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Labels</label>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            {taskDetail.labels.map(({ label }) => (
                                                <span key={label.id} style={{ padding: "3px 10px", borderRadius: "0px", fontSize: "0.75rem", fontWeight: 600, background: `${label.color}22`, color: label.color }}>
                                                    {label.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Comments */}
                                <div>
                                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
                                        Comments ({taskDetail.comments?.length ?? 0})
                                    </label>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                                        {(taskDetail.comments ?? []).map((c) => (
                                            <div key={c.id} style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                                                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--accent)", marginBottom: "4px" }}>{c.user.name}</div>
                                                <div style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{c.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {members.length > 0 && (
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <select className="input-field" value={commentUserId} onChange={(e) => setCommentUserId(Number(e.target.value))} style={{ width: "120px", flexShrink: 0 }}>
                                                <option value="">As…</option>
                                                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <input className="input-field" placeholder="Add a comment…" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addComment()} style={{ flex: 1 }} />
                                            <button className="btn-primary" onClick={addComment} disabled={savingComment || !newComment.trim() || !commentUserId} style={{ flexShrink: 0 }}>
                                                {savingComment ? "…" : "Post"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar metadata */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {[
                                    { label: "Creator", value: taskDetail.creator.name },
                                    { label: "Assignee", value: taskDetail.assignee?.name ?? "Unassigned" },
                                    { label: "Story Points", value: taskDetail.storyPoints ?? "Not estimated" },
                                    { label: "Due Date", value: taskDetail.dueDate ? new Date(taskDetail.dueDate).toLocaleDateString() : "—" },
                                ].map(({ label, value }) => (
                                    <div key={label}>
                                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                                        <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{value}</div>
                                    </div>
                                ))}

                                <hr />

                                <div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Activity</div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflow: "auto" }}>
                                        {(taskDetail.activities ?? []).length === 0 ? (
                                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>No activity yet</div>
                                        ) : taskDetail.activities?.map((activity) => (
                                            <div key={activity.id} style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                                                <strong style={{ color: "var(--text)" }}>{activity.actorName}</strong> {activity.type.replace("_", " ").toLowerCase()}
                                                {activity.field ? ` ${activity.field}` : ""}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <hr />

                                <button
                                    onClick={() => { if (confirm("Soft-delete this task?")) deleteTask(selectedTask); }}
                                    style={{ color: "var(--danger)", fontSize: "0.82rem", padding: "8px 0", textAlign: "left" }}
                                >
                                    🗑 Delete task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
