"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type User = { id: number; name: string };
type Sprint = { id: number; name: string; isActive: boolean; _count?: { tasks: number } };
type Project = {
    id: number;
    key?: string | null;
    name: string;
    organization: { id: number; name: string };
    sprints: Sprint[];
};
type Issue = {
    id: number;
    key?: string | null;
    issueType: "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
    title: string;
    status: string;
    priority: string;
    storyPoints?: number | null;
    assignee?: User | null;
    _count: { comments: number };
};

const ISSUE_TYPES = ["STORY", "TASK", "BUG", "EPIC"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export default function ProjectBacklogPage() {
    const { id } = useParams<{ id: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        title: "",
        issueType: "STORY",
        priority: "MEDIUM",
        storyPoints: "",
        assigneeId: "",
    });

    const load = useCallback(async () => {
        setLoading(true);
        const projectData = await fetch(`/api/projects/${id}`).then((r) => r.json());
        const backlogData = await fetch(`/api/tasks?projectId=${id}&backlog=true`).then((r) => r.json());
        setProject(projectData);
        setIssues(backlogData);
        if (projectData?.organization?.id) {
            const users = await fetch(`/api/users?orgId=${projectData.organization.id}`).then((r) => r.json());
            setMembers(users);
        }
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const createIssue = async () => {
        if (!form.title.trim()) return;
        setCreating(true);
        await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: form.title.trim(),
                projectId: Number(id),
                issueType: form.issueType,
                priority: form.priority,
                storyPoints: form.storyPoints ? Number(form.storyPoints) : undefined,
                assigneeId: form.assigneeId ? Number(form.assigneeId) : undefined,
            }),
        });
        setForm({ title: "", issueType: "STORY", priority: "MEDIUM", storyPoints: "", assigneeId: "" });
        setCreating(false);
        load();
    };

    const moveToSprint = async (issue: Issue, sprintId: number) => {
        setIssues((prev) => prev.filter((item) => item.id !== issue.id));
        await fetch(`/api/tasks/${issue.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sprintId, status: "TODO" }),
        });
        load();
    };

    if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading backlog...</div>;
    if (!project) return <div style={{ padding: "60px", textAlign: "center", color: "var(--danger)" }}>Project not found.</div>;

    const activeSprint = project.sprints.find((s) => s.isActive);
    const futureSprints = project.sprints.filter((s) => !s.isActive);

    return (
        <div style={{ padding: "36px 48px", maxWidth: "1120px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>&gt;</span>
                <Link href={`/projects/${project.id}`} style={{ color: "var(--accent)" }}>{project.name}</Link>
                <span>&gt;</span>
                <span>Backlog</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "20px", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 800 }}>Backlog</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.86rem", marginTop: "4px" }}>
                        {project.key ?? "PRJ"} issues not yet committed to a sprint.
                    </p>
                </div>
                {activeSprint && (
                    <Link href={`/sprints/${activeSprint.id}`}>
                        <button className="btn-primary">Open Active Sprint</button>
                    </Link>
                )}
            </div>

            <div className="glass" style={{ padding: "18px", marginBottom: "22px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 120px 110px 150px auto", gap: "10px", alignItems: "center" }}>
                    <input className="input-field" placeholder="What should the team build next?" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                    <select className="input-field" value={form.issueType} onChange={(e) => setForm((f) => ({ ...f, issueType: e.target.value }))}>
                        {ISSUE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <select className="input-field" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                        {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                    <input className="input-field" type="number" min="0" placeholder="Points" value={form.storyPoints} onChange={(e) => setForm((f) => ({ ...f, storyPoints: e.target.value }))} />
                    <select className="input-field" value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                        <option value="">Unassigned</option>
                        {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                    <button className="btn-primary" onClick={createIssue} disabled={creating || !form.title.trim()}>
                        {creating ? "Adding..." : "Add"}
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "22px" }}>
                <section>
                    <h2 style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                        Backlog - {issues.length}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {issues.length === 0 ? (
                            <div className="glass" style={{ padding: "44px", textAlign: "center", color: "var(--text-muted)" }}>
                                The backlog is clear.
                            </div>
                        ) : issues.map((issue) => (
                            <div key={issue.id} className="glass kanban-card" style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "90px 1fr auto", gap: "12px", alignItems: "center" }}>
                                <div style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 700 }}>{issue.key ?? `#${issue.id}`}</div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{issue.title}</div>
                                    <div style={{ display: "flex", gap: "8px", marginTop: "5px", color: "var(--text-muted)", fontSize: "0.74rem" }}>
                                        <span>{issue.issueType}</span>
                                        <span>{issue.priority}</span>
                                        <span>{issue.storyPoints ?? "-"} pts</span>
                                        <span>{issue.assignee?.name ?? "Unassigned"}</span>
                                    </div>
                                </div>
                                <select className="input-field" defaultValue="" onChange={(e) => e.target.value && moveToSprint(issue, Number(e.target.value))} style={{ width: "170px" }}>
                                    <option value="">Move to sprint...</option>
                                    {project.sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </section>

                <aside>
                    <h2 style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
                        Sprint Plan
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {activeSprint && (
                            <Link href={`/sprints/${activeSprint.id}`} className="glass kanban-card" style={{ padding: "16px", display: "block" }}>
                                <div style={{ color: "var(--accent2)", fontSize: "0.72rem", fontWeight: 700, marginBottom: "5px" }}>ACTIVE</div>
                                <div style={{ fontWeight: 700 }}>{activeSprint.name}</div>
                                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "4px" }}>{activeSprint._count?.tasks ?? 0} issues</div>
                            </Link>
                        )}
                        {futureSprints.map((sprint) => (
                            <Link key={sprint.id} href={`/sprints/${sprint.id}`} className="glass-sm kanban-card" style={{ padding: "14px", display: "block" }}>
                                <div style={{ fontWeight: 600 }}>{sprint.name}</div>
                                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "4px" }}>{sprint._count?.tasks ?? 0} issues</div>
                            </Link>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
}
