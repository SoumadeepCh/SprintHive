"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    ClipboardList, Circle, Loader, Eye, CheckCircle2,
    Calendar, MessageSquare, Sparkles, ChevronRight
} from "lucide-react";

type User = { id: number; name: string };
type Label = { id: number; name: string; color: string };
type Task = {
    id: number; key?: string | null; issueType?: string; title: string; description?: string;
    status: string; priority: string;
    assignee?: User; creator: User;
    labels: { label: Label }[];
    dueDate?: string;
    sprint?: { id: number; name: string } | null;
    project: { id: number; name: string; key?: string | null };
    _count: { comments: number };
};

const STATUS_ORDER = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const STATUS_LABELS: Record<string, string> = {
    TODO: "Todo", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done",
};
const STATUS_COLORS: Record<string, string> = {
    TODO: "#9292b0", IN_PROGRESS: "#a78bfa", REVIEW: "#fcd34d", DONE: "#6ee7b7",
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
    TODO: <Circle size={14} />,
    IN_PROGRESS: <Loader size={14} />,
    REVIEW: <Eye size={14} />,
    DONE: <CheckCircle2 size={14} />,
};
const PRIORITY_COLORS: Record<string, string> = {
    LOW: "#6ee7b7", MEDIUM: "#fbbf24", HIGH: "#f97316", URGENT: "#f87171",
};

export default function MyTasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("");

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filter) params.set("status", filter);
        fetch(`/api/tasks/my?${params}`)
            .then((r) => r.json())
            .then((data) => {
                setTasks(data);
                setLoading(false);
            });
    }, [filter]);

    const grouped = STATUS_ORDER.reduce((acc, status) => {
        acc[status] = tasks.filter((t) => t.status === status);
        return acc;
    }, {} as Record<string, Task[]>);

    const totalTasks = tasks.length;
    const completedTasks = grouped["DONE"]?.length ?? 0;

    return (
        <div style={{ padding: "36px 48px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <ChevronRight size={14} />
                <span>My Tasks</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: "10px" }}>
                        <ClipboardList size={24} style={{ color: "var(--accent)" }} /> My Tasks
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {totalTasks} task{totalTasks !== 1 ? "s" : ""} assigned to you · {completedTasks} completed
                    </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                    <button
                        className={filter === "" ? "btn-primary" : "btn-ghost"}
                        onClick={() => setFilter("")}
                        style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                    >All</button>
                    {STATUS_ORDER.filter(s => s !== "DONE").map((s) => (
                        <button
                            key={s}
                            className={filter === s ? "btn-primary" : "btn-ghost"}
                            onClick={() => setFilter(s)}
                            style={{ padding: "6px 14px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px" }}
                        >{STATUS_ICONS[s]} {STATUS_LABELS[s]}</button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                    <Loader size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
                    Loading your tasks…
                </div>
            ) : tasks.length === 0 ? (
                <div className="glass" style={{ padding: "60px", textAlign: "center" }}>
                    <Sparkles size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                    <h3 style={{ fontWeight: 600, marginBottom: "8px" }}>
                        {filter ? `No ${STATUS_LABELS[filter]?.toLowerCase()} tasks` : "No tasks assigned to you"}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        {filter ? "Try a different filter." : "Tasks assigned to you will appear here."}
                    </p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {STATUS_ORDER.map((status) => {
                        const statusTasks = filter ? tasks : grouped[status];
                        if (filter && filter !== status) return null;
                        if (!statusTasks || statusTasks.length === 0) return null;

                        return (
                            <div key={status}>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "10px",
                                    marginBottom: "12px", paddingBottom: "8px",
                                    borderBottom: `2px solid ${STATUS_COLORS[status]}33`,
                                }}>
                                    <div style={{ color: STATUS_COLORS[status] }}>{STATUS_ICONS[status]}</div>
                                    <h2 style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                                        {STATUS_LABELS[status]}
                                    </h2>
                                    <span style={{
                                        fontSize: "0.75rem", color: "var(--text-muted)",
                                        background: "var(--surface2)", padding: "2px 8px",
                                        borderRadius: "12px",
                                    }}>
                                        {statusTasks.length}
                                    </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    {statusTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="glass kanban-card"
                                            style={{
                                                padding: "16px 20px",
                                                display: "grid",
                                                gridTemplateColumns: "auto 1fr auto",
                                                gap: "0 16px",
                                                alignItems: "center",
                                            }}
                                        >
                                            {/* Priority dot */}
                                            <div style={{
                                                width: "8px", height: "8px", borderRadius: "50%",
                                                background: PRIORITY_COLORS[task.priority],
                                            }} />

                                            {/* Task info */}
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: "0.9rem", marginBottom: "4px" }}>
                                                    {task.title}
                                                </div>
                                                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                                    <Link
                                                        href={task.sprint ? `/sprints/${task.sprint.id}` : `/projects/${task.project.id}/backlog`}
                                                        style={{
                                                            fontSize: "0.75rem", color: "var(--accent)",
                                                            background: "rgba(124,111,247,0.08)",
                                                            padding: "2px 8px", borderRadius: "12px",
                                                            display: "flex", alignItems: "center", gap: "4px",
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ChevronRight size={10} />
                                                        {task.key ?? `#${task.id}`} - {task.project.name} &gt; {task.sprint?.name ?? "Backlog"}
                                                    </Link>
                                                    {task.issueType && (
                                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{task.issueType}</span>
                                                    )}
                                                    {task.labels.map(({ label }) => (
                                                        <span key={label.id} style={{
                                                            padding: "1px 7px", borderRadius: "12px",
                                                            fontSize: "0.7rem", fontWeight: 600,
                                                            background: `${label.color}22`, color: label.color,
                                                        }}>{label.name}</span>
                                                    ))}
                                                    {task._count.comments > 0 && (
                                                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                                                            <MessageSquare size={11} /> {task._count.comments}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Meta */}
                                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                {task.dueDate && (
                                                    <span style={{
                                                        fontSize: "0.75rem", color: "var(--text-muted)",
                                                        background: "var(--surface2)", padding: "3px 10px",
                                                        borderRadius: "12px", display: "flex", alignItems: "center", gap: "4px",
                                                    }}>
                                                        <Calendar size={11} /> {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <span style={{
                                                    fontSize: "0.7rem", fontWeight: 600,
                                                    padding: "3px 10px", borderRadius: "12px",
                                                    background: `${PRIORITY_COLORS[task.priority]}18`,
                                                    color: PRIORITY_COLORS[task.priority],
                                                }}>
                                                    {task.priority}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
