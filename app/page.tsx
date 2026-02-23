"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cache } from "@/lib/cache";

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
		await fetch("/api/orgs", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: orgName.trim() }),
		});
		setOrgName("");
		setShowCreate(false);
		setCreating(false);
		cache.del("orgs");
		loadOrgs();
	};

	return (
		<div style={{ padding: "40px 48px", maxWidth: "1100px", margin: "0 auto" }}>
			{/* Header */}
			<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px" }}>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
						<span style={{ fontSize: "1.6rem" }}>⬡</span>
						<h1 style={{
							fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em",
							background: "linear-gradient(135deg, #a78bfa 0%, #6ee7b7 100%)",
							WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
						}}>Sprint Manager</h1>
					</div>
					<p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
						Team Task &amp; Sprint Manager — Jira-lite
					</p>
				</div>
				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<Link href="/search" className="btn-ghost">🔍 Search</Link>
					<Link href="/tasks" className="btn-ghost">Tasks</Link>
					<Link href="/logs" className="btn-ghost">Logs</Link>
					<button className="btn-primary" onClick={() => setShowCreate(true)}>
						+ New Organization
					</button>
				</div>
			</div>

			{/* Stats bar */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "36px" }}>
				{[
					{ label: "Organizations", value: orgs.length, icon: "⬡" },
					{ label: "Total Projects", value: orgs.reduce((s, o) => s + o._count.projects, 0), icon: "◈" },
					{ label: "Team Members", value: orgs.reduce((s, o) => s + o._count.memberships, 0), icon: "◎" },
				].map((stat) => (
					<div key={stat.label} className="glass" style={{ padding: "20px 24px" }}>
						<div style={{ fontSize: "1.5rem", marginBottom: "8px" }}>{stat.icon}</div>
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
					<div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.3 }}>⬡</div>
					<p style={{ color: "var(--text-muted)" }}>No organizations yet. Create one to get started.</p>
				</div>
			) : (
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
					{orgs.map((org) => (
						<Link key={org.id} href={`/orgs/${org.id}`} style={{ display: "block" }}>
							<div className="glass kanban-card" style={{ padding: "22px 24px", cursor: "pointer" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
									<div style={{
										width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
										background: "linear-gradient(135deg, #7c6ff7, #6ee7b7)",
										display: "flex", alignItems: "center", justifyContent: "center",
										fontWeight: 700, fontSize: "1.1rem", color: "#fff",
									}}>
										{org.name[0].toUpperCase()}
									</div>
									<div>
										<div style={{ fontWeight: 600, fontSize: "1rem" }}>{org.name}</div>
										<div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>by {org.owner.name}</div>
									</div>
								</div>
								<div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
									<span>📁 {org._count.projects} projects</span>
									<span>👥 {org._count.memberships} members</span>
								</div>
							</div>
						</Link>
					))}
				</div>
			)}

			{/* Create Org Modal — simplified: only org name needed */}
			{showCreate && (
				<div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
					<div className="modal-box anim-modal" style={{ padding: "32px" }}>
						<h2 style={{ fontWeight: 700, fontSize: "1.2rem", marginBottom: "6px" }}>Create Organization</h2>
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
