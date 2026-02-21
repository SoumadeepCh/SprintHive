"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cache } from "@/lib/cache";

/* ── Types ──────────────────────────────────────────────── */
type Summary = {
    totalTasks: number; completedTasks: number; completionRate: number;
    totalSprints: number; activeSprintName: string | null;
    highPriorityOpen: number; avgTasksPerSprint: number;
};
type VelocityRow = { id: number; name: string; completed: number; total: number };
type StatusRow = { status: string; count: number };
type WorkloadRow = { id: number; name: string; todo: number; inProgress: number; review: number; done: number; total: number };

/* ── Color tokens ───────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
    TODO: "#94a3b8", IN_PROGRESS: "#7c6ff7", REVIEW: "#f59e0b", DONE: "#6ee7b7",
};
const WORKLOAD_COLORS = ["#7c6ff7", "#f59e0b", "#94a3b8", "#6ee7b7"];

/* ── Tiny SVG bar chart ─────────────────────────────────── */
function BarChart({ data }: { data: VelocityRow[] }) {
    if (!data.length) return <EmptyChart label="No sprints found" />;
    const W = 580, H = 200, PAD = 32, BAR_W = Math.min(40, (W - PAD * 2) / data.length - 12);
    const maxVal = Math.max(...data.map((d) => d.total), 1);
    const slot = (W - PAD * 2) / data.length;

    return (
        <svg viewBox={`0 0 ${W} ${H + 36}`} style={{ width: "100%", overflow: "visible" }}>
            {/* Y gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                const y = PAD + (1 - pct) * H;
                return (
                    <g key={pct}>
                        <line x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                        <text x={PAD - 6} y={y + 4} textAnchor="end" fill="#6b7280" fontSize={10}>
                            {Math.round(pct * maxVal)}
                        </text>
                    </g>
                );
            })}

            {data.map((d, i) => {
                const cx = PAD + i * slot + slot / 2;
                const totalH = (d.total / maxVal) * H;
                const doneH = (d.completed / maxVal) * H;

                return (
                    <g key={d.id}>
                        {/* Total bar (dim) */}
                        <rect
                            x={cx - BAR_W / 2} y={PAD + H - totalH}
                            width={BAR_W} height={totalH}
                            rx={4} fill="rgba(124,111,247,0.2)"
                        />
                        {/* Completed (done) bar */}
                        <rect
                            x={cx - BAR_W / 2} y={PAD + H - doneH}
                            width={BAR_W} height={doneH}
                            rx={4} fill="#7c6ff7"
                        />
                        {/* Value label */}
                        {d.total > 0 && (
                            <text x={cx} y={PAD + H - totalH - 6} textAnchor="middle" fill="#e2e8f0" fontSize={11} fontWeight="600">
                                {d.completed}/{d.total}
                            </text>
                        )}
                        {/* X label */}
                        <text x={cx} y={PAD + H + 20} textAnchor="middle" fill="#9ca3af" fontSize={10}>
                            {d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

/* ── Donut chart ────────────────────────────────────────── */
function DonutChart({ data }: { data: StatusRow[] }) {
    if (!data.length) return <EmptyChart label="No tasks found" />;
    const total = data.reduce((s, d) => s + d.count, 0);
    if (total === 0) return <EmptyChart label="No tasks yet" />;

    const R = 70, CX = 90, CY = 90, INNER = 40;
    const circumference = 2 * Math.PI * R;
    let offset = 0;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <svg viewBox="0 0 180 180" style={{ width: "160px", flexShrink: 0 }}>
                {data.map((d) => {
                    const frac = d.count / total;
                    const dash = frac * circumference;
                    const gap = circumference - dash;
                    const el = (
                        <circle
                            key={d.status}
                            cx={CX} cy={CY} r={R}
                            fill="none"
                            stroke={STATUS_COLORS[d.status] ?? "#64748b"}
                            strokeWidth={22}
                            strokeDasharray={`${dash} ${gap}`}
                            strokeDashoffset={-offset * circumference}
                            style={{ transition: "stroke-dasharray 0.6s ease" }}
                        />
                    );
                    offset += frac;
                    return el;
                })}
                {/* Inner hole */}
                <circle cx={CX} cy={CY} r={INNER} fill="var(--surface2)" />
                <text x={CX} y={CY - 6} textAnchor="middle" fill="#e2e8f0" fontSize={20} fontWeight="700">{total}</text>
                <text x={CX} y={CY + 14} textAnchor="middle" fill="#6b7280" fontSize={10}>tasks</text>
            </svg>

            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                {data.map((d) => (
                    <div key={d.status} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: STATUS_COLORS[d.status] ?? "#64748b", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.82rem", flex: 1 }}>{d.status.replace("_", " ")}</div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{d.count}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: "36px", textAlign: "right" }}>
                            {Math.round((d.count / total) * 100)}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Workload horizontal bars ───────────────────────────── */
function WorkloadChart({ data }: { data: WorkloadRow[] }) {
    if (!data.length) return <EmptyChart label="No members found" />;
    const maxTotal = Math.max(...data.map((d) => d.total), 1);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Legend row */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "4px" }}>
                {["Todo", "In Progress", "Review", "Done"].map((label, i) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: WORKLOAD_COLORS[i] }} />
                        {label}
                    </div>
                ))}
            </div>

            {data.map((row) => {
                const segments = [
                    { val: row.todo, color: WORKLOAD_COLORS[0] },
                    { val: row.inProgress, color: WORKLOAD_COLORS[1] },
                    { val: row.review, color: WORKLOAD_COLORS[2] },
                    { val: row.done, color: WORKLOAD_COLORS[3] },
                ];
                const barPct = (row.total / maxTotal) * 100;

                return (
                    <div key={row.id}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                                {/* Avatar initial */}
                                <span style={{
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    width: "20px", height: "20px", borderRadius: "50%", marginRight: "7px",
                                    background: "linear-gradient(135deg,#7c6ff7,#6ee7b7)", fontSize: "0.65rem", fontWeight: 700, color: "#fff",
                                }}>
                                    {row.name[0].toUpperCase()}
                                </span>
                                {row.name}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{row.total} task{row.total !== 1 ? "s" : ""}</span>
                        </div>
                        <div style={{ height: "10px", borderRadius: "6px", background: "var(--surface3)", overflow: "hidden", width: "100%" }}>
                            <div style={{ display: "flex", height: "100%", width: `${barPct}%`, transition: "width 0.6s ease" }}>
                                {segments.map((seg, i) => (
                                    seg.val > 0 ? (
                                        <div
                                            key={i}
                                            style={{
                                                width: `${(seg.val / row.total) * 100}%`,
                                                background: seg.color,
                                                minWidth: seg.val > 0 ? "2px" : "0",
                                            }}
                                        />
                                    ) : null
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ── Empty state ────────────────────────────────────────── */
function EmptyChart({ label }: { label: string }) {
    return (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px", opacity: 0.3 }}>📊</div>
            {label}
        </div>
    );
}

/* ── KPI tile ───────────────────────────────────────────── */
function KpiTile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
    return (
        <div className="glass" style={{ padding: "20px 24px", flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>{label}</div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: accent ?? "var(--text)", lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "6px" }}>{sub}</div>}
        </div>
    );
}

/* ── Chart card wrapper ─────────────────────────────────── */
function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="glass" style={{ padding: "24px 28px" }}>
            <div style={{ marginBottom: "20px" }}>
                <h2 style={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</h2>
                {subtitle && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "3px" }}>{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

/* ── Burn-down chart ────────────────────────────────── */
type BurnRow = { day: string; remaining: number; done: number; total: number; ideal: number };

function BurndownChart({ series, total }: { series: BurnRow[]; total: number }) {
    if (series.length === 0) {
        return (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px", opacity: 0.3 }}>📉</div>
                Set sprint start/end dates to see the burn-down chart
            </div>
        );
    }

    const W = 560; const H = 160; const PAD = { t: 10, r: 10, b: 30, l: 32 };
    const chartW = W - PAD.l - PAD.r;
    const chartH = H - PAD.t - PAD.b;
    const n = series.length;
    const maxY = total;

    const px = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * chartW;
    const py = (v: number) => PAD.t + chartH - (v / Math.max(maxY, 1)) * chartH;

    const pathFor = (key: "remaining" | "ideal") =>
        series.map((r, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(r[key]).toFixed(1)}`).join(" ");

    // X-axis: show first, middle, last date labels
    const labelIdxs = [0, Math.floor(n / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
            {/* Y gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const y = py(f * maxY);
                return (
                    <g key={f}>
                        <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border)" strokeWidth={0.5} />
                        <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
                            {Math.round(f * maxY)}
                        </text>
                    </g>
                );
            })}

            {/* Ideal line (dashed) */}
            <path d={pathFor("ideal")} fill="none" stroke="rgba(110,231,183,0.5)" strokeWidth={1.5} strokeDasharray="5,4" />

            {/* Actual area */}
            <path
                d={`${pathFor("remaining")} L${px(n - 1).toFixed(1)},${py(0).toFixed(1)} L${px(0).toFixed(1)},${py(0).toFixed(1)} Z`}
                fill="rgba(167,139,250,0.08)"
            />
            {/* Actual line */}
            <path d={pathFor("remaining")} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots on actual */}
            {series.map((r, i) => (
                <circle key={i} cx={px(i)} cy={py(r.remaining)} r={3} fill="#a78bfa" />
            ))}

            {/* X-axis labels */}
            {labelIdxs.map(i => (
                <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
                    {series[i].day.slice(5)} {/* MM-DD */}
                </text>
            ))}

            {/* Legend */}
            <g transform={`translate(${PAD.l + 8}, ${PAD.t + 4})`}>
                <line x1={0} y1={0} x2={16} y2={0} stroke="rgba(110,231,183,0.5)" strokeWidth={1.5} strokeDasharray="4,3" />
                <text x={20} y={4} fontSize={9} fill="var(--text-muted)">Ideal</text>
                <line x1={52} y1={0} x2={68} y2={0} stroke="#a78bfa" strokeWidth={2} />
                <text x={72} y={4} fontSize={9} fill="var(--text-muted)">Actual</text>
            </g>
        </svg>
    );
}

type AnalyticsBundle = {
    summary: Summary; velocity: VelocityRow[]; statusData: StatusRow[];
    workload: WorkloadRow[]; projectName: string; orgId: number | null; activeSprint: number | null;
    burndown: { series: BurnRow[]; total: number } | null;
};


/* ── Main page ──────────────────────────────────────────── */
export default function AnalyticsPage() {
    const { id: projectId } = useParams<{ id: string }>();
    const CACHE_KEY = `analytics:${projectId}`;

    const cached = cache.get<AnalyticsBundle>(CACHE_KEY);
    const [summary, setSummary] = useState<Summary | null>(cached?.summary ?? null);
    const [velocity, setVelocity] = useState<VelocityRow[]>(cached?.velocity ?? []);
    const [statusData, setStatusData] = useState<StatusRow[]>(cached?.statusData ?? []);
    const [workload, setWorkload] = useState<WorkloadRow[]>(cached?.workload ?? []);
    const [burndown, setBurndown] = useState<{ series: BurnRow[]; total: number } | null>(cached?.burndown ?? null);
    const [projectName, setProjectName] = useState(cached?.projectName ?? "");
    const [orgId, setOrgId] = useState<number | null>(cached?.orgId ?? null);
    const [activeSprint, setActiveSprint] = useState<number | null>(cached?.activeSprint ?? null);
    const [loading, setLoading] = useState(!cached);
    const [refreshing, setRefreshing] = useState(false); // silent background refresh

    useEffect(() => {
        const boot = async () => {
            const hasCached = !!cache.get<AnalyticsBundle>(CACHE_KEY);
            if (!hasCached) setLoading(true);
            else setRefreshing(true); // show subtle dot, not full spinner

            // 1. Fetch project
            const proj = await fetch(`/api/projects/${projectId}`).then((r) => r.json());
            setProjectName(proj.name);
            const oid = proj.organization?.id ?? proj.organizationId;
            setOrgId(oid);
            const active = proj.sprints?.find((s: { isActive: boolean; id: number }) => s.isActive);
            if (active) setActiveSprint(active.id);

            // 2. Parallel-fetch all analytics endpoints
            const [sum, vel, work] = await Promise.all([
                fetch(`/api/analytics/summary?projectId=${projectId}`).then((r) => r.json()),
                fetch(`/api/analytics/velocity?projectId=${projectId}`).then((r) => r.json()),
                oid ? fetch(`/api/analytics/workload?orgId=${oid}`).then((r) => r.json()) : Promise.resolve([]),
            ]);

            setSummary(sum);
            setVelocity(vel);
            setWorkload(work);

            // 3. Status breakdown + burn-down for active sprint
            let st: StatusRow[] = [];
            let bd: { series: BurnRow[]; total: number } | null = null;
            if (active) {
                const [stRes, bdRes] = await Promise.all([
                    fetch(`/api/analytics/status?sprintId=${active.id}`).then(r => r.json()),
                    fetch(`/api/analytics/burndown?sprintId=${active.id}`).then(r => r.json()),
                ]);
                st = stRes;
                bd = { series: bdRes.series ?? [], total: bdRes.total ?? 0 };
                setStatusData(st);
                setBurndown(bd);
            }

            // Cache the whole bundle for 2 minutes — analytics are expensive
            cache.set<AnalyticsBundle>(CACHE_KEY, {
                summary: sum, velocity: vel, statusData: st, burndown: bd,
                workload: work, projectName: proj.name,
                orgId: oid, activeSprint: active?.id ?? null,
            }, 120_000);

            setLoading(false);
            setRefreshing(false);
        };
        boot();
    }, [projectId]);

    if (loading) {
        return (
            <div style={{ padding: "80px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px", opacity: 0.4 }}>⚡</div>
                Running aggregations…
            </div>
        );
    }

    return (
        <div className="page-enter" style={{ padding: "36px 48px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "28px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <Link href={`/projects/${projectId}`} style={{ color: "var(--accent)" }}>{projectName}</Link>
                <span>›</span>
                <span>Analytics</span>
                {refreshing && <span className="refresh-dot" style={{ marginLeft: "8px" }} title="Refreshing…" />}
            </div>

            {/* Header */}
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                    📊 Analytics
                    <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "10px", fontSize: "1rem" }}>{projectName}</span>
                </h1>
                {summary?.activeSprintName && (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        Active sprint: <strong style={{ color: "var(--accent2)" }}>{summary.activeSprintName}</strong>
                    </p>
                )}
            </div>

            {/* KPI Row */}
            {summary && (
                <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
                    <KpiTile label="Total Tasks" value={summary.totalTasks} />
                    <KpiTile label="Completed" value={summary.completedTasks} accent="#6ee7b7" />
                    <KpiTile label="Completion Rate" value={`${summary.completionRate}%`} accent={summary.completionRate >= 70 ? "#6ee7b7" : summary.completionRate >= 40 ? "#f59e0b" : "#f87171"} sub={`${summary.completedTasks} of ${summary.totalTasks} done`} />
                    <KpiTile label="Sprints" value={summary.totalSprints} sub={`~${summary.avgTasksPerSprint} tasks/sprint avg`} />
                    <KpiTile label="Urgent / High Open" value={summary.highPriorityOpen} accent={summary.highPriorityOpen > 0 ? "#f87171" : "#6ee7b7"} sub="not yet completed" />
                </div>
            )}

            {/* Charts row 1: velocity + donut */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", marginBottom: "20px" }}>
                <ChartCard
                    title="Sprint Velocity"
                    subtitle="Completed (solid) vs Total (dim) tasks per sprint · raw SQL + FILTER aggregate"
                >
                    <BarChart data={velocity} />
                    {velocity.length > 0 && (
                        <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "flex-end" }}>
                            {[["#7c6ff7", "Completed"], ["rgba(124,111,247,0.2)", "Total"]].map(([c, l]) => (
                                <div key={l} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: c }} />{l}
                                </div>
                            ))}
                        </div>
                    )}
                </ChartCard>

                <ChartCard
                    title={activeSprint ? "Tasks by Status" : "Tasks by Status"}
                    subtitle={activeSprint ? "Active sprint · Prisma groupBy()" : "Activate a sprint to see breakdown"}
                >
                    <DonutChart data={statusData} />
                </ChartCard>
            </div>

            {/* Charts row 2: burn-down + workload */}
            {activeSprint && (
                <ChartCard
                    title="Burn-down Chart"
                    subtitle={`Active sprint · daily remaining tasks · ideal vs actual · raw SQL date_series + SUM OVER`}
                >
                    <BurndownChart series={burndown?.series ?? []} total={burndown?.total ?? 0} />
                </ChartCard>
            )}

            <ChartCard
                title="Team Workload"
                subtitle={`Assigned tasks per member in this organization · raw SQL multi-FILTER aggregate${orgId ? ` (org ${orgId})` : ""}`}
            >
                <WorkloadChart data={workload} />
            </ChartCard>

            {/* SQL callout */}
            <div style={{
                marginTop: "28px", padding: "18px 22px", borderRadius: "var(--radius)",
                background: "linear-gradient(135deg, rgba(124,111,247,0.08), rgba(110,231,183,0.05))",
                border: "1px solid rgba(124,111,247,0.2)",
                fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.7,
            }}>
                <span style={{ fontWeight: 600, color: "var(--accent)", marginRight: "6px" }}>⚡ Phase 2 ORM techniques used:</span>
                <strong style={{ color: "var(--text)" }}>Prisma.groupBy()</strong> for per-status counts ·{" "}
                <strong style={{ color: "var(--text)" }}>$queryRaw + FILTER aggregate</strong> for multi-column velocity ·{" "}
                <strong style={{ color: "var(--text)" }}>CTE + sub-select</strong> for single-round-trip KPI summary ·{" "}
                <strong style={{ color: "var(--text)" }}>BigInt → Number conversion</strong> for JSON serialization
            </div>
        </div>
    );
}
