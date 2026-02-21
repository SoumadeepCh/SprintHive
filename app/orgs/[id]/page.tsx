"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cache } from "@/lib/cache";

type Member = { id: number; name: string; email: string };
type Project = { id: number; name: string; description?: string; createdAt: string; _count: { sprints: number } };
type Org = {
    id: number; name: string;
    owner: Member;
    members: Member[];
    projects: Project[];
};

export default function OrgPage() {
    const { id } = useParams<{ id: string }>();
    const CACHE_KEY = `org:${id}`;
    const [org, setOrg] = useState<Org | null>(() => cache.get<Org>(CACHE_KEY));
    const [loading, setLoading] = useState(() => !cache.get<Org>(CACHE_KEY));
    const [showProject, setShowProject] = useState(false);
    const [showMember, setShowMember] = useState(false);
    const [projForm, setProjForm] = useState({ name: "", description: "" });
    const [memberForm, setMemberForm] = useState({ name: "", email: "" });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        if (!cache.get<Org>(CACHE_KEY)) setLoading(true);
        const r = await fetch(`/api/orgs/${id}`);
        const data = await r.json();
        setOrg(data);
        cache.set(CACHE_KEY, data, 60_000);
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    const createProject = async () => {
        if (!projForm.name) return;
        setSaving(true);
        await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...projForm, organizationId: Number(id) }),
        });
        setProjForm({ name: "", description: "" });
        setShowProject(false);
        setSaving(false);
        cache.del(CACHE_KEY); cache.del("orgs");
        load();
    };

    const addMember = async () => {
        if (!memberForm.name || !memberForm.email) return;
        setSaving(true);
        await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...memberForm, organizationId: Number(id) }),
        });
        setMemberForm({ name: "", email: "" });
        setShowMember(false);
        setSaving(false);
        cache.del(CACHE_KEY);
        load();
    };

    if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>;
    if (!org) return <div style={{ padding: "60px", textAlign: "center", color: "var(--danger)" }}>Organization not found.</div>;

    return (
        <div style={{ padding: "36px 48px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <span>{org.name}</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                        width: "52px", height: "52px", borderRadius: "14px", flexShrink: 0,
                        background: "linear-gradient(135deg, #7c6ff7, #6ee7b7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "1.4rem", color: "#fff",
                    }}>
                        {org.name[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>{org.name}</h1>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Owner: {org.owner.name}</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="btn-ghost" onClick={() => setShowMember(true)}>+ Add Member</button>
                    <button className="btn-primary" onClick={() => setShowProject(true)}>+ New Project</button>
                </div>
            </div>

            {/* Projects section */}
            <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px" }}>
                Projects · {org.projects.length}
            </h2>

            {org.projects.length === 0 ? (
                <div className="glass" style={{ padding: "48px", textAlign: "center", marginBottom: "28px" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px", opacity: 0.3 }}>◈</div>
                    <p style={{ color: "var(--text-muted)" }}>No projects yet. Create one to start sprinting.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "14px", marginBottom: "32px" }}>
                    {org.projects.map((p) => (
                        <Link key={p.id} href={`/projects/${p.id}`}>
                            <div className="glass kanban-card" style={{ padding: "20px" }}>
                                <div style={{ fontWeight: 600, marginBottom: "6px" }}>{p.name}</div>
                                {p.description && <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "10px" }}>{p.description}</div>}
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>🏃 {p._count.sprints} sprint{p._count.sprints !== 1 ? "s" : ""}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Members section */}
            <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px" }}>
                Members · {org.members.length}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {org.members.map((m) => (
                    <div key={m.id} className="glass-sm" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                            background: "linear-gradient(135deg, #7c6ff7, #6ee7b7)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: "0.8rem", color: "#fff",
                        }}>
                            {m.name[0].toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{m.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.email}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Project Modal */}
            {showProject && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowProject(false)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "20px" }}>New Project</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Project Name</label>
                                <input className="input-field" placeholder="Mobile App v2" value={projForm.name} onChange={(e) => setProjForm((f) => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Description (optional)</label>
                                <input className="input-field" placeholder="Brief description…" value={projForm.description} onChange={(e) => setProjForm((f) => ({ ...f, description: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowProject(false)}>Cancel</button>
                            <button className="btn-primary" onClick={createProject} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showMember && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowMember(false)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "20px" }}>Add Member</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Name</label>
                                <input className="input-field" placeholder="John Smith" value={memberForm.name} onChange={(e) => setMemberForm((f) => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Email</label>
                                <input className="input-field" placeholder="john@acme.com" value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} />
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowMember(false)}>Cancel</button>
                            <button className="btn-primary" onClick={addMember} disabled={saving}>{saving ? "Adding…" : "Add"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
