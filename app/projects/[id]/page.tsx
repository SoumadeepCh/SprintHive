"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cache } from "@/lib/cache";

type Sprint = {
    id: number; name: string; isActive: boolean;
    startDate?: string; endDate?: string;
    _count: { tasks: number };
};
type Project = {
    id: number; name: string; description?: string;
    organization: { id: number; name: string };
    sprints: Sprint[];
    labels: { id: number; name: string; color: string }[];
};

export default function ProjectPage() {
    const { id } = useParams<{ id: string }>();
    const CACHE_KEY = `project:${id}`;
    const [project, setProject] = useState<Project | null>(() => cache.get<Project>(CACHE_KEY));
    const [loading, setLoading] = useState(() => !cache.get<Project>(CACHE_KEY));
    const [showSprint, setShowSprint] = useState(false);
    const [showLabel, setShowLabel] = useState(false);
    const [sprintForm, setSprintForm] = useState({ name: "", startDate: "", endDate: "" });
    const [labelForm, setLabelForm] = useState({ name: "", color: "#7c6ff7" });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        if (!cache.get<Project>(CACHE_KEY)) setLoading(true);
        const r = await fetch(`/api/projects/${id}`);
        const data = await r.json();
        setProject(data);
        cache.set(CACHE_KEY, data, 60_000);
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    const createSprint = async () => {
        if (!sprintForm.name) return;
        setSaving(true);
        await fetch("/api/sprints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...sprintForm, projectId: Number(id) }),
        });
        setSprintForm({ name: "", startDate: "", endDate: "" });
        setShowSprint(false);
        setSaving(false);
        cache.del(CACHE_KEY);
        load();
    };

    const createLabel = async () => {
        if (!labelForm.name) return;
        setSaving(true);
        await fetch("/api/labels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...labelForm, projectId: Number(id) }),
        });
        setLabelForm({ name: "", color: "#7c6ff7" });
        setShowLabel(false);
        setSaving(false);
        cache.del(CACHE_KEY);
        load();
    };

    const activateSprint = async (sprintId: number) => {
        await fetch(`/api/sprints/${sprintId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
        });
        cache.del(CACHE_KEY);
        load();
    };

    if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>;
    if (!project) return <div style={{ padding: "60px", textAlign: "center", color: "var(--danger)" }}>Project not found.</div>;

    return (
        <div style={{ padding: "36px 48px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <Link href={`/orgs/${project.organization.id}`} style={{ color: "var(--accent)" }}>{project.organization.name}</Link>
                <span>›</span>
                <span>{project.name}</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
                <div>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>{project.name}</h1>
                    {project.description && <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "4px" }}>{project.description}</p>}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <Link href={`/analytics/${id}`}>
                        <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "5px" }}>📊 Analytics</button>
                    </Link>
                    <Link href={`/projects/${id}/timeline`}>
                        <button className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: "5px" }}>📅 Timeline</button>
                    </Link>
                    <button className="btn-ghost" onClick={() => setShowLabel(true)}>+ Label</button>
                    <button className="btn-primary" onClick={() => setShowSprint(true)}>+ New Sprint</button>
                </div>
            </div>

            {/* Labels */}
            {project.labels.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
                    {project.labels.map((l) => (
                        <span key={l.id} style={{
                            padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600,
                            background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}44`,
                        }}>{l.name}</span>
                    ))}
                </div>
            )}

            {/* Sprints */}
            <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px" }}>
                Sprints · {project.sprints.length}
            </h2>

            {project.sprints.length === 0 ? (
                <div className="glass" style={{ padding: "48px", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px", opacity: 0.3 }}>🏃</div>
                    <p style={{ color: "var(--text-muted)" }}>No sprints yet. Create your first sprint.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {project.sprints.map((sprint) => (
                        <div key={sprint.id} className="glass" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                            {/* Status dot */}
                            <div style={{
                                width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                                background: sprint.isActive ? "var(--accent2)" : "var(--text-muted)",
                                boxShadow: sprint.isActive ? "0 0 10px rgba(110,231,183,0.5)" : "none",
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{sprint.name}</div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                    {sprint._count.tasks} task{sprint._count.tasks !== 1 ? "s" : ""}
                                    {sprint.startDate && ` · ${new Date(sprint.startDate).toLocaleDateString()} – ${sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : "?"}`}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {sprint.isActive && (
                                    <span className="badge badge-done" style={{ fontSize: "0.7rem" }}>ACTIVE</span>
                                )}
                                {!sprint.isActive && (
                                    <button className="btn-ghost" style={{ fontSize: "0.8rem", padding: "5px 12px" }} onClick={() => activateSprint(sprint.id)}>
                                        Activate
                                    </button>
                                )}
                                <Link href={`/sprints/${sprint.id}`}>
                                    <button className="btn-primary" style={{ padding: "7px 16px", fontSize: "0.82rem" }}>Open Board →</button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Sprint Modal */}
            {showSprint && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSprint(false)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "20px" }}>New Sprint</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Sprint Name</label>
                                <input className="input-field" placeholder="Sprint 1" value={sprintForm.name} onChange={(e) => setSprintForm((f) => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Start Date</label>
                                    <input type="date" className="input-field" value={sprintForm.startDate} onChange={(e) => setSprintForm((f) => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>End Date</label>
                                    <input type="date" className="input-field" value={sprintForm.endDate} onChange={(e) => setSprintForm((f) => ({ ...f, endDate: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowSprint(false)}>Cancel</button>
                            <button className="btn-primary" onClick={createSprint} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Label Modal */}
            {showLabel && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowLabel(false)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "20px" }}>Create Label</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Label Name</label>
                                <input className="input-field" placeholder="bug, feature, urgent…" value={labelForm.name} onChange={(e) => setLabelForm((f) => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Color</label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <input type="color" value={labelForm.color} onChange={(e) => setLabelForm((f) => ({ ...f, color: e.target.value }))}
                                        style={{ width: "44px", height: "36px", border: "none", background: "none", cursor: "pointer", padding: 0 }} />
                                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{labelForm.color}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowLabel(false)}>Cancel</button>
                            <button className="btn-primary" onClick={createLabel} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
