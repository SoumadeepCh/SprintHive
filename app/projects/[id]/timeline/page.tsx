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

const MS_PER_DAY = 86_400_000;

function parseDate(d: string | undefined): Date | null {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function fmt(d: Date): string {
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function TimelinePage() {
    const { id } = useParams<{ id: string }>();
    const CACHE_KEY = `project:${id}`;
    const [project, setProject] = useState<Project | null>(() => cache.get<Project>(CACHE_KEY));
    const [loading, setLoading] = useState(() => !cache.get<Project>(CACHE_KEY));

    useEffect(() => {
        if (cache.get<Project>(CACHE_KEY)) return; // already cached
        setLoading(true);
        fetch(`/api/projects/${id}`)
            .then(r => r.json())
            .then(d => { setProject(d); cache.set(CACHE_KEY, d, 60_000); setLoading(false); });
    }, [id]);

    if (loading) return <div style={{ padding: "80px", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>;
    if (!project) return <div style={{ padding: "80px", textAlign: "center", color: "var(--danger)" }}>Project not found.</div>;

    // Compute date range for Gantt x-axis
    const datedSprints = project.sprints.filter(s => s.startDate && s.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allDates = datedSprints.flatMap(s => [parseDate(s.startDate)!, parseDate(s.endDate)!]);
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : today;
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : today;

    // Add 7-day padding on each side
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);

    const totalDays = Math.max((maxDate.getTime() - minDate.getTime()) / MS_PER_DAY, 1);

    const toPercent = (d: Date) =>
        Math.max(0, Math.min(100, ((d.getTime() - minDate.getTime()) / MS_PER_DAY / totalDays) * 100));

    const todayPct = toPercent(today);

    // Month markers for x-axis
    const monthMarkers: { label: string; pct: number }[] = [];
    const cursor = new Date(minDate);
    cursor.setDate(1);
    while (cursor <= maxDate) {
        monthMarkers.push({
            label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            pct: toPercent(cursor),
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return (
        <div className="page-enter" style={{ padding: "36px 48px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <Link href={`/projects/${project.id}`} style={{ color: "var(--accent)" }}>{project.name}</Link>
                <span>›</span>
                <span>Timeline</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>📅 Sprint Timeline</h1>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>{project.name} · {project.sprints.length} sprint{project.sprints.length !== 1 ? "s" : ""}</p>
                </div>
                {/* Legend */}
                <div style={{ display: "flex", gap: "14px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {[
                        ["#a78bfa", "Active"],
                        ["#6ee7b7", "Completed"],
                        ["#4a4a6a", "Upcoming"],
                        ["#f87171", "Overdue"],
                    ].map(([c, l]) => (
                        <span key={l} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: c, display: "inline-block" }} />
                            {l}
                        </span>
                    ))}
                </div>
            </div>

            {project.sprints.length === 0 ? (
                <div className="glass" style={{ padding: "60px", textAlign: "center" }}>
                    <div style={{ fontSize: "2.5rem", opacity: 0.3, marginBottom: "12px" }}>📅</div>
                    <p style={{ color: "var(--text-muted)" }}>No sprints yet. Create one on the project page.</p>
                </div>
            ) : (
                <div className="glass" style={{ padding: "24px 28px", overflow: "auto" }}>
                    {/* Month labels */}
                    <div style={{ position: "relative", height: "24px", marginLeft: "200px", marginBottom: "8px" }}>
                        {monthMarkers.map(m => (
                            <div key={m.label} style={{
                                position: "absolute", left: `${m.pct}%`,
                                fontSize: "0.68rem", color: "var(--text-muted)",
                                transform: "translateX(-50%)",
                                whiteSpace: "nowrap",
                            }}>{m.label}</div>
                        ))}
                    </div>

                    {/* Rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {project.sprints.map(sprint => {
                            const start = parseDate(sprint.startDate);
                            const end = parseDate(sprint.endDate);
                            const hasDates = start && end;

                            const isCompleted = end && end < today && !sprint.isActive;
                            const isOverdue = end && end < today && sprint.isActive;
                            const barColor = sprint.isActive
                                ? isOverdue ? "#f87171" : "#a78bfa"
                                : isCompleted ? "#6ee7b7" : "#4a4a6a";

                            const startPct = hasDates ? toPercent(start!) : 0;
                            const widthPct = hasDates
                                ? Math.max(toPercent(end!) - startPct, 1)
                                : 100;

                            const daysLeft = end ? Math.ceil((end.getTime() - today.getTime()) / MS_PER_DAY) : null;

                            return (
                                <Link key={sprint.id} href={`/sprints/${sprint.id}`} style={{ display: "flex", alignItems: "center", gap: "0", textDecoration: "none" }}>
                                    {/* Sprint name column */}
                                    <div style={{
                                        width: "200px", flexShrink: 0, paddingRight: "16px",
                                        display: "flex", flexDirection: "column", gap: "2px",
                                    }}>
                                        <div style={{ fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {sprint.name}
                                            {sprint.isActive && (
                                                <span style={{ marginLeft: "6px", padding: "0 5px", borderRadius: "20px", fontSize: "0.65rem", background: "rgba(167,139,250,0.2)", color: "#a78bfa" }}>●</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                            {sprint._count.tasks} task{sprint._count.tasks !== 1 ? "s" : ""}
                                            {daysLeft !== null && sprint.isActive && (
                                                <span style={{ marginLeft: "6px", color: daysLeft < 0 ? "#f87171" : daysLeft <= 3 ? "#fbbf24" : "var(--text-muted)" }}>
                                                    {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "due today" : `${daysLeft}d left`}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Gantt bar area */}
                                    <div style={{ flex: 1, position: "relative", height: "36px" }}>
                                        {/* Grid lines */}
                                        {monthMarkers.map(m => (
                                            <div key={m.label} style={{
                                                position: "absolute", left: `${m.pct}%`, top: 0, bottom: 0,
                                                width: "1px", background: "var(--border)", opacity: 0.5,
                                            }} />
                                        ))}

                                        {/* Today line */}
                                        <div style={{
                                            position: "absolute", left: `${todayPct}%`, top: 0, bottom: 0,
                                            width: "2px", background: "#f87171", opacity: 0.7, borderRadius: "1px",
                                        }} />

                                        {/* Bar */}
                                        {hasDates ? (
                                            <div style={{
                                                position: "absolute",
                                                left: `${startPct}%`,
                                                width: `${widthPct}%`,
                                                top: "6px", height: "24px",
                                                borderRadius: "6px",
                                                background: `${barColor}33`,
                                                border: `1.5px solid ${barColor}88`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "0.68rem", color: barColor, fontWeight: 600,
                                                overflow: "hidden", whiteSpace: "nowrap",
                                                transition: "opacity 0.15s",
                                                cursor: "pointer",
                                            }}>
                                                {widthPct > 8 && `${fmt(start!)} – ${fmt(end!)}`}
                                            </div>
                                        ) : (
                                            <div style={{
                                                position: "absolute", left: "5%", width: "90%",
                                                top: "6px", height: "24px", borderRadius: "6px",
                                                border: "1.5px dashed var(--border)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "0.68rem", color: "var(--text-muted)",
                                            }}>
                                                No dates set
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{
                marginTop: "20px", padding: "14px 18px", borderRadius: "var(--radius)",
                background: "rgba(124,111,247,0.05)", border: "1px solid rgba(124,111,247,0.15)",
                fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.7,
            }}>
                <span style={{ fontWeight: 600, color: "var(--accent)" }}>📅 Timeline: </span>
                Positions calculated from{" "}
                <code style={{ background: "var(--surface2)", padding: "0 4px", borderRadius: "3px" }}>startDate</code> / <code style={{ background: "var(--surface2)", padding: "0 4px", borderRadius: "3px" }}>endDate</code>
                {" "}fields on each sprint. Red vertical line = today. Set sprint dates on the project page.
            </div>
        </div>
    );
}
