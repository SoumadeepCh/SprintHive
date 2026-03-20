"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cache } from "@/lib/cache";
import { toast } from "sonner";
import {
	Hexagon, Plus, FolderKanban, Users, Building2
} from "lucide-react";

type Org = {
	id: number;
	name: string;
	owner: { id: number; name: string; email: string };
	_count: { memberships: number; projects: number };
	createdAt: string;
};

export default function DashboardPage() {
	const [orgs, setOrgs] = useState<Org[]>(() => cache.get<Org[]>("orgs") ?? []);
	const [loading, setLoading] = useState(() => !cache.get<Org[]>("orgs"));
	const [showCreate, setShowCreate] = useState(false);
	const [orgName, setOrgName] = useState("");
	const [creating, setCreating] = useState(false);

	const loadOrgs = async () => {
		if (!cache.get<Org[]>("orgs")) setLoading(true);
		const r = await fetch("/api/orgs");
		const data = await r.json();
		setOrgs(data);
		cache.set("orgs", data, 60_000);
		setLoading(false);
	};

	useEffect(() => { loadOrgs(); }, []);

	const createOrg = async () => {
		if (!orgName.trim()) return;
		setCreating(true);
		const res = await fetch("/api/orgs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: orgName.trim() }),
		});
		if (res.ok) {
			toast.success("Organization created!", { description: orgName.trim() });
			setOrgName("");
			setShowCreate(false);
			cache.del("orgs");
			loadOrgs();
		} else {
			const data = await res.json();
			toast.error("Failed to create organization", { description: data.error });
		}
		setCreating(false);
	};

	return (
		<div style={{ padding: "40px 48px", maxWidth: "1100px", margin: "0 auto" }}>
			{/* Header */}
			<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px" }}>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
						<Hexagon size={28} style={{ color: "var(--accent)" }} />
						<h1 style={{
							fontSize: "2.4rem", fontWeight: 800, letterSpacing: "-0.03em",
							color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase"
						}}>Sprint Manager</h1>
					</div>
					<p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
						Team Task &amp; Sprint Manager — Jira-lite
					</p>
				</div>
				<button className="btn-primary" onClick={() => setShowCreate(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<Plus size={15} /> New Organization
				</button>
			</div>

			{/* Stats bar */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "36px" }}>
				{[
					{ label: "Organizations", value: orgs.length, icon: <Building2 size={22} style={{ color: "var(--accent)" }} /> },
					{ label: "Total Projects", value: orgs.reduce((s, o) => s + o._count.projects, 0), icon: <FolderKanban size={22} style={{ color: "#6ee7b7" }} /> },
					{ label: "Team Members", value: orgs.reduce((s, o) => s + o._count.memberships, 0), icon: <Users size={22} style={{ color: "#a78bfa" }} /> },
				].map((stat) => (
					<div key={stat.label} className="glass" style={{ padding: "20px 24px" }}>
						<div style={{ marginBottom: "8px" }}>{stat.icon}</div>
						<div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)" }}>{stat.value}</div>
						<div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "2px" }}>{stat.label}</div>
					</div>
				))}
			</div>

			{/* Org list */}
			<h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "16px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
				Your Organizations
			</h2>

			{loading ? (
				<div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
			) : orgs.length === 0 ? (
				<div className="glass" style={{ padding: "60px", textAlign: "center" }}>
					<Building2 size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
					<p style={{ color: "var(--text-muted)" }}>No organizations yet. Create one to get started.</p>
				</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
					{orgs.map((org) => (
						<Link key={org.id} href={`/orgs/${org.id}`} style={{ display: "block" }}>
							<div className="glass kanban-card" style={{ padding: "22px 24px", cursor: "pointer" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
									<div style={{
										width: "44px", height: "44px", borderRadius: "0px", flexShrink: 0,
										background: "var(--primary)", border: "4px solid var(--border)",
										display: "flex", alignItems: "center", justifyContent: "center",
										fontWeight: 800, fontSize: "1.2rem", color: "var(--text)", fontFamily: "'Space Grotesk', sans-serif"
									}}>
										{org.name[0].toUpperCase()}
									</div>
									<div>
										<div style={{ fontWeight: 600, fontSize: "1rem" }}>{org.name}</div>
										<div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>by {org.owner.name}</div>
									</div>
								</div>
								<div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
									<span style={{ display: "flex", alignItems: "center", gap: "4px" }}><FolderKanban size={13} /> {org._count.projects} projects</span>
									<span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Users size={13} /> {org._count.memberships} members</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}

			{/* Create Org Modal */}
			{showCreate && (
				<div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
					<div className="modal-box anim-modal" style={{ padding: "32px" }}>
						<h2 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
							<Building2 size={20} /> Create Organization
						</h2>
						<p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>
							You will be set as the owner automatically.
						</p>
						<div>
							<label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px" }}>Organization Name</label>
							<input
								className="input-field"
								placeholder="Acme Corp"
								value={orgName}
								onChange={(e) => setOrgName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && createOrg()}
								autoFocus
							/>
						</div>
						<div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
							<button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
							<button className="btn-primary" onClick={createOrg} disabled={creating}>
								{creating ? "Creating…" : "Create"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
