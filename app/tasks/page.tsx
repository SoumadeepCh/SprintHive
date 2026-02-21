"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type User = { id: number; name: string };
type Label = { id: number; name: string; color: string };
type Task = {
    id: number; title: string; description?: string;
    status: string; priority: string; version: number;
    assignee?: User; creator: User;
    labels: { label: Label }[];
    dueDate?: string;
    _count: { comments: number };
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: "#6ee7b7", MEDIUM: "#fbbf24", HIGH: "#f97316", URGENT: "#f87171",
};
const STATUS_COLORS: Record<string, string> = {
    TODO: "#9292b0", IN_PROGRESS: "#a78bfa", REVIEW: "#fcd34d", DONE: "#6ee7b7",
};

export default function TasksBrowser() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [nextCursor, setCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInit] = useState(true);
    const [conflict, setConflict] = useState<number | null>(null); // task id with conflict

    const LIMIT = 8;

    const fetchPage = useCallback(async (cursor?: number) => {
        setLoading(true);
        const params = new URLSearchParams({ limit: String(LIMIT) });
        if (cursor) params.set("cursor", String(cursor));

        const res = await fetch(`/api/tasks?${params}`);
        const json = await res.json();

        setTasks(prev => cursor ? [...prev, ...json.data] : json.data);
        setCursor(json.nextCursor);
        setHasMore(json.hasMore);
        setLoading(false);
        setInit(false);
    }, []);

    useEffect(() => { fetchPage(); }, [fetchPage]);

    /** Demonstrate optimistic concurrency: move task status + send current version */
    const moveStatus = async (task: Task, newStatus: string) => {
        const res = await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus, version: task.version }),
        });

        if (res.status === 409) {
            // Conflict! Another request changed the task since we loaded it.
            setConflict(task.id);
            setTimeout(() => setConflict(null), 3000);
            // Re-fetch to get latest state
            fetchPage();
            return;
        }

        const updated = await res.json();
        setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    };

    if (initialLoad) {
        return <div style={{ padding: "80px", textAlign: "center", color: "var(--text-muted)" }}>Loading tasks…</div>;
    }

    return (
        <div style={{ padding: "36px 48px", maxWidth: "1000px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <span>All Tasks</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>All Tasks</h1>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        Cursor-paginated · {LIMIT} per page ·{" "}
                        <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.78rem" }}>
                            {"{"} data, nextCursor, hasMore {"}"}
                        </code>
                    </p>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Showing {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                </div>
            </div>

            {/* Conflict toast */}
            {conflict && (
                <div style={{
                    marginBottom: "16px", padding: "12px 18px", borderRadius: "var(--radius-sm)",
                    background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.4)",
                    color: "#f87171", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "10px",
                }}>
                    <span>⚠️</span>
                    <span>
                        <strong>Version conflict on task #{conflict}</strong> — it was modified by another request.
                        Re-fetched the latest state. Your change was not saved.
                    </span>
                </div>
            )}

            {tasks.length === 0 ? (
                <div className="glass" style={{ padding: "60px", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", opacity: 0.3, marginBottom: "12px" }}>📋</div>
                    <p style={{ color: "var(--text-muted)" }}>No tasks across any sprints yet.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {tasks.map(task => (
                        <div
                            key={task.id}
                            className={`glass${conflict === task.id ? " anim-in" : ""}`}
                            style={{
                                padding: "16px 20px",
                                display: "grid",
                                gridTemplateColumns: "auto 1fr auto auto auto",
                                gap: "0 16px",
                                alignItems: "center",
                                border: conflict === task.id ? "1px solid rgba(248,113,113,0.5)" : undefined,
                            }}
                        >
                            {/* Priority dot */}
                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />

                            {/* Title + meta */}
                            <div>
                                <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: "3px" }}>{task.title}</div>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    {task.labels.map(({ label }) => (
                                        <span key={label.id} style={{ padding: "1px 7px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 600, background: `${label.color}22`, color: label.color }}>{label.name}</span>
                                    ))}
                                    {task._count.comments > 0 && (
                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>💬 {task._count.comments}</span>
                                    )}
                                </div>
                            </div>

                            {/* Version badge — shows optimistic concurrency token */}
                            <div title="Optimistic concurrency version token" style={{
                                padding: "2px 8px", borderRadius: "20px",
                                background: "var(--surface2)", border: "1px solid var(--border)",
                                fontSize: "0.72rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums",
                            }}>v{task.version}</div>

                            {/* Status pill (clickable → demonstrates optimistic concurrency) */}
                            <div style={{ display: "flex", gap: "4px" }}>
                                {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => task.status !== s && moveStatus(task, s)}
                                        style={{
                                            padding: "2px 8px", borderRadius: "20px", fontSize: "0.68rem", fontWeight: 600,
                                            background: task.status === s ? `${STATUS_COLORS[s]}22` : "transparent",
                                            color: task.status === s ? STATUS_COLORS[s] : "var(--text-muted)",
                                            border: task.status === s ? `1px solid ${STATUS_COLORS[s]}55` : "1px solid transparent",
                                            cursor: task.status === s ? "default" : "pointer",
                                            opacity: task.status === s ? 1 : 0.5,
                                            transition: "all 0.15s",
                                        }}
                                    >
                                        {s === "IN_PROGRESS" ? "⚡" : s === "DONE" ? "✓" : s === "REVIEW" ? "👁" : "○"}
                                    </button>
                                ))}
                            </div>

                            {/* Assignee avatar */}
                            {task.assignee ? (
                                <div title={task.assignee.name} style={{
                                    width: "26px", height: "26px", borderRadius: "50%",
                                    background: "linear-gradient(135deg,#7c6ff7,#6ee7b7)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "0.65rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                                }}>
                                    {task.assignee.name[0].toUpperCase()}
                                </div>
                            ) : (
                                <div style={{ width: "26px" }} />
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                    <button
                        className="btn-primary"
                        onClick={() => nextCursor && fetchPage(nextCursor)}
                        disabled={loading}
                        style={{ padding: "10px 32px" }}
                    >
                        {loading ? "Loading…" : `Load more →`}
                    </button>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px" }}>
                        Next cursor: <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px" }}>{nextCursor}</code>
                    </p>
                </div>
            )}

            {!hasMore && tasks.length > 0 && (
                <p style={{ textAlign: "center", marginTop: "20px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    All {tasks.length} tasks loaded
                </p>
            )}

            {/* Technique callout */}
            <div style={{
                marginTop: "28px", padding: "16px 20px", borderRadius: "var(--radius)",
                background: "linear-gradient(135deg, rgba(124,111,247,0.06), rgba(110,231,183,0.04))",
                border: "1px solid rgba(124,111,247,0.18)",
                fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.7,
            }}>
                <span style={{ fontWeight: 600, color: "var(--accent)", marginRight: "6px" }}>⚡ Phase 3 patterns shown:</span>
                <strong style={{ color: "var(--text)" }}>Cursor pagination</strong> — each status click sends{" "}
                <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px" }}>{"{"}status, version{"}"}</code>.
                If the{" "}
                <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px" }}>version</code>
                {" "}field changed since you loaded the task, the API returns{" "}
                <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px" }}>409 VERSION_CONFLICT</code>
                {" "}and the list auto-refreshes. The{" "}
                <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px" }}>v{"{n}"}</code>
                {" "}badge shows the current concurrency token.
            </div>
        </div>
    );
}
