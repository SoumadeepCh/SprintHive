"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cache } from "@/lib/cache";
import { toast } from "sonner";
import {
    UserPlus, FolderPlus, Mail, X, Clock, Folder,
    Users, MailCheck, FolderKanban
} from "lucide-react";

type Member = { id: number; name: string; email: string; role?: string };
type Project = { id: number; name: string; description?: string; createdAt: string; _count: { sprints: number } };
type Invitation = { id: number; token: string; email: string; status: string; inviter: { id: number; name: string }; createdAt: string };
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
    const [showInvite, setShowInvite] = useState(false);
    const [projForm, setProjForm] = useState({ name: "", description: "" });
    const [inviteEmail, setInviteEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [invitations, setInvitations] = useState<Invitation[]>([]);

    const load = async () => {
        if (!cache.get<Org>(CACHE_KEY)) setLoading(true);
        const r = await fetch(`/api/orgs/${id}`);
        const data = await r.json();
        setOrg(data);
        cache.set(CACHE_KEY, data, 60_000);
        setLoading(false);
    };

    const loadInvitations = async () => {
        const r = await fetch(`/api/orgs/${id}/invitations`);
        const data = await r.json();
        setInvitations(data);
    };

    useEffect(() => { load(); loadInvitations(); }, [id]);

    const createProject = async () => {
        if (!projForm.name) return;
        setSaving(true);
        const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...projForm, organizationId: Number(id) }),
        });
        if (res.ok) {
            toast.success("Project created!", { description: projForm.name });
            setProjForm({ name: "", description: "" });
            setShowProject(false);
            cache.del(CACHE_KEY); cache.del("orgs");
            load();
        } else {
            const data = await res.json();
            toast.error("Failed to create project", { description: data.error });
        }
        setSaving(false);
    };

    const sendInvitation = async () => {
        if (!inviteEmail) return;
        setSaving(true);
        const res = await fetch(`/api/orgs/${id}/invitations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: inviteEmail }),
        });
        const data = await res.json();
        if (!res.ok) {
            toast.error("Invitation failed", { description: data.error });
        } else {
            toast.success("Invitation sent!", { description: `Email sent to ${inviteEmail}` });
            setInviteEmail("");
            setShowInvite(false);
            loadInvitations();
        }
        setSaving(false);
    };

    const cancelInvitation = async (invId: number, email: string) => {
        const res = await fetch(`/api/orgs/${id}/invitations?invitationId=${invId}`, { method: "DELETE" });
        if (res.ok) {
            toast.success("Invitation cancelled", { description: email });
            loadInvitations();
        } else {
            const data = await res.json();
            toast.error("Failed to cancel", { description: data.error });
        }
    };

    if (loading) return <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>;
    if (!org) return <div style={{ padding: "60px", textAlign: "center", color: "var(--danger)" }}>Organization not found.</div>;

    const pendingInvitations = invitations.filter((i) => i.status === "PENDING");

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
                        background: "var(--primary)", border: "4px solid var(--border)",
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
                    <button className="btn-ghost" onClick={() => setShowInvite(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <UserPlus size={15} /> Invite Member
                    </button>
                    <button className="btn-primary" onClick={() => setShowProject(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FolderPlus size={15} /> New Project
                    </button>
                </div>
            </div>

            {/* Projects section */}
            <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <FolderKanban size={14} /> Projects · {org.projects.length}
            </h2>

            {org.projects.length === 0 ? (
                <div className="glass" style={{ padding: "48px", textAlign: "center", marginBottom: "28px" }}>
                    <Folder size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                    <p style={{ color: "var(--text-muted)" }}>No projects yet. Create one to start sprinting.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: "14px", marginBottom: "32px" }}>
                    {org.projects.map((p) => (
                        <Link key={p.id} href={`/projects/${p.id}`}>
                            <div className="glass kanban-card" style={{ padding: "20px" }}>
                                <div style={{ fontWeight: 600, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <FolderKanban size={14} style={{ color: "var(--accent)" }} /> {p.name}
                                </div>
                                {p.description && <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "10px" }}>{p.description}</div>}
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>🏃 {p._count.sprints} sprint{p._count.sprints !== 1 ? "s" : ""}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Members section */}
            <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={14} /> Members · {org.members.length}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "28px" }}>
                {org.members.map((m) => (
                    <div key={m.id} className="glass-sm" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                            background: "var(--primary)", border: "4px solid var(--border)",
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

            {/* Pending Invitations */}
            {pendingInvitations.length > 0 && (
                <>
                    <h2 style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Clock size={14} /> Pending Invitations · {pendingInvitations.length}
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "28px" }}>
                        {pendingInvitations.map((inv) => (
                            <div key={inv.id} className="glass-sm" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <div style={{
                                        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                                        background: "rgba(124,111,247,0.15)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                        <Mail size={14} style={{ color: "var(--accent)" }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500, fontSize: "0.875rem" }}>{inv.email}</div>
                                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                            Invited by {inv.inviter.name} · {new Date(inv.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{
                                        padding: "3px 10px", borderRadius: "0px", fontSize: "0.7rem", fontWeight: 600,
                                        background: "rgba(251,191,36,0.12)", color: "#fbbf24",
                                    }}>PENDING</span>
                                    <button
                                        className="btn-ghost"
                                        style={{ padding: "3px 10px", fontSize: "0.72rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}
                                        onClick={() => cancelInvitation(inv.id, inv.email)}
                                    ><X size={12} /> Cancel</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Create Project Modal */}
            {showProject && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowProject(false)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <FolderPlus size={18} /> New Project
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Project Name</label>
                                <input className="input-field" placeholder="Mobile App v2" value={projForm.name} onChange={(e) => setProjForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
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

            {/* Invite Member Modal */}
            {showInvite && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowInvite(false)}>
                    <div className="modal-box anim-modal" style={{ padding: "32px" }}>
                        <h2 style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                            <UserPlus size={18} /> Invite Member
                        </h2>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "20px" }}>
                            They'll receive an email and must accept to join.
                        </p>
                        <div>
                            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Email Address</label>
                            <input
                                className="input-field"
                                type="email"
                                placeholder="colleague@company.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendInvitation()}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
                            <button className="btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
                            <button className="btn-primary" onClick={sendInvitation} disabled={saving || !inviteEmail} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <MailCheck size={14} /> {saving ? "Sending…" : "Send Invitation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
