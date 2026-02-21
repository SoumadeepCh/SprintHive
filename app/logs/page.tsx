"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type LogEntry = {
    id: number; model: string; operation: string;
    durationMs: number; slow: boolean; timestamp: string;
};
type ModelStats = {
    model: string; operation: string;
    count: number; minMs: number; maxMs: number; avgMs: number; slowCount: number;
};
type LogResponse = {
    totalCaptured: number;
    logs: LogEntry[];
    stats: ModelStats[];
    slowThresholdMs: number;
};

/* ── Duration bar ───────────────────────────────────── */
function DurationBar({ ms, max }: { ms: number; max: number }) {
    const pct = max > 0 ? Math.min((ms / max) * 100, 100) : 0;
    const color = ms > 500 ? "#f87171" : ms > 200 ? "#fbbf24" : "#6ee7b7";
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "72px", height: "5px", borderRadius: "3px", background: "var(--surface3)", flexShrink: 0 }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", background: color }} />
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color, fontVariantNumeric: "tabular-nums", minWidth: "42px" }}>
                {ms}ms
            </span>
        </div>
    );
}

/* ── Stats table row ────────────────────────────────── */
function StatsRow({ s, maxAvg }: { s: ModelStats; maxAvg: number }) {
    const pct = maxAvg > 0 ? (s.avgMs / maxAvg) * 100 : 0;
    const color = s.avgMs > 500 ? "#f87171" : s.avgMs > 200 ? "#fbbf24" : "#6ee7b7";
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 50px 60px 60px 100px 60px",
            gap: "0 12px",
            padding: "9px 18px",
            borderBottom: "1px solid var(--border)",
            alignItems: "center",
            fontSize: "0.82rem",
        }}>
            <span style={{ fontWeight: 600 }}>{s.model}</span>
            <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: "0.78rem" }}>{s.operation}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{s.count}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#6ee7b7", textAlign: "right" }}>{s.minMs}ms</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#f87171", textAlign: "right" }}>{s.maxMs}ms</span>
            {/* Avg bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ flex: 1, height: "5px", borderRadius: "3px", background: "var(--surface3)" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: "3px", background: color }} />
                </div>
                <span style={{ fontSize: "0.75rem", color, fontVariantNumeric: "tabular-nums", minWidth: "36px" }}>{s.avgMs}ms</span>
            </div>
            <span style={{ textAlign: "right", color: s.slowCount > 0 ? "#f87171" : "var(--text-muted)", fontSize: "0.75rem" }}>
                {s.slowCount > 0 ? `🐢 ${s.slowCount}` : "—"}
            </span>
        </div>
    );
}

/* ── Page ───────────────────────────────────────────── */
export default function LogsPage() {
    const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState<ModelStats[]>([]);
    const [total, setTotal] = useState(0);
    const [autoRefresh, setAuto] = useState(true);
    const [filter, setFilter] = useState<"all" | "slow">("all");
    const [tab, setTab] = useState<"logs" | "stats">("logs");
    const newestIdRef = useRef(0);   // used for incremental since= polling
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /* Initial full load */
    const loadFull = async () => {
        const res = await fetch("/api/logs");
        const data: LogResponse = await res.json();
        setAllLogs(data.logs);
        setStats(data.stats);
        setTotal(data.totalCaptured);
        newestIdRef.current = data.logs[0]?.id ?? 0;
    };

    /* Incremental poll — only fetches entries newer than what we have */
    const pollIncremental = async () => {
        const since = newestIdRef.current;
        const res = await fetch(`/api/logs?since=${since}`);
        const data: LogResponse = await res.json();

        setStats(data.stats);   // stats are always re-sent (cheap Map → O(k) where k=unique ops)
        setTotal(data.totalCaptured);

        if (data.logs.length > 0) {
            newestIdRef.current = data.logs[0].id;
            // Prepend new entries, trim to MAX_LOGS
            setAllLogs(prev => [...data.logs, ...prev].slice(0, 50));
        }
    };

    useEffect(() => { loadFull(); }, []);

    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(pollIncremental, 2000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [autoRefresh]);

    const visibleLogs = allLogs.filter(l => filter === "slow" ? l.slow : true);
    const maxMs = visibleLogs.length ? Math.max(...visibleLogs.map(l => l.durationMs)) : 1;
    const slowCount = allLogs.filter(l => l.slow).length;
    const maxAvgMs = stats.length ? Math.max(...stats.map(s => s.avgMs)) : 1;

    return (
        <div style={{ padding: "36px 48px", maxWidth: "1100px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <span>Query Logs</span>
            </div>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" }}>⚡ Prisma Query Logs</h1>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "3px" }}>
                        Captured by{" "}
                        <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>$extends</code>
                        {" "}middleware · ring buffer (last 50) · incremental polling via{" "}
                        <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>?since=</code>
                    </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button className={filter === "slow" ? "btn-primary" : "btn-ghost"} onClick={() => setFilter(f => f === "slow" ? "all" : "slow")} style={{ fontSize: "0.8rem" }}>
                        🐢 Slow ({slowCount})
                    </button>
                    <button className={autoRefresh ? "btn-primary" : "btn-ghost"} onClick={() => setAuto(a => !a)} style={{ fontSize: "0.8rem" }}>
                        {autoRefresh ? "● Live" : "○ Paused"}
                    </button>
                    <button className="btn-ghost" onClick={loadFull} style={{ fontSize: "0.8rem" }}>↻ Reset</button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                {[
                    { label: "Total captured", value: total },
                    { label: "Slow (>200ms)", value: slowCount, color: slowCount > 0 ? "#f87171" : "#6ee7b7" },
                    { label: "Unique ops", value: stats.length },
                    { label: "Fastest avg", value: stats.length ? `${Math.min(...stats.map(s => s.avgMs))}ms` : "—", color: "#6ee7b7" },
                    { label: "Slowest avg", value: stats.length ? `${Math.max(...stats.map(s => s.avgMs))}ms` : "—", color: "#f87171" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="glass" style={{ padding: "12px 16px", flex: 1 }}>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>{label}</div>
                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: color ?? "var(--text)" }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", gap: "0", marginBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                {[["logs", "📋 Raw Logs"], ["stats", "📊 Stats by Op"]].map(([t, label]) => (
                    <button
                        key={t} onClick={() => setTab(t as "logs" | "stats")}
                        style={{
                            padding: "8px 18px", fontSize: "0.83rem", fontWeight: tab === t ? 700 : 400,
                            color: tab === t ? "var(--accent)" : "var(--text-muted)",
                            borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                            marginBottom: "-1px", background: "none", transition: "all 0.15s",
                        }}
                    >{label}</button>
                ))}
            </div>

            {/* ── Logs tab ─────────── */}
            {tab === "logs" && (
                visibleLogs.length === 0 ? (
                    <div className="glass" style={{ padding: "60px", textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", opacity: 0.3, marginBottom: "12px" }}>📋</div>
                        <p style={{ color: "var(--text-muted)" }}>No logs yet — make some API calls.</p>
                    </div>
                ) : (
                    <div className="glass" style={{ overflow: "hidden" }}>
                        <div style={{
                            display: "grid", gridTemplateColumns: "28px 1fr 1fr 160px 1fr",
                            gap: "0 14px", padding: "8px 18px",
                            background: "var(--surface2)", borderBottom: "1px solid var(--border)",
                            fontSize: "0.69rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                            <span></span><span>Model</span><span>Operation</span><span>Duration</span><span>Timestamp</span>
                        </div>
                        {visibleLogs.map((log, i) => (
                            <div key={log.id} style={{
                                display: "grid", gridTemplateColumns: "28px 1fr 1fr 160px 1fr",
                                gap: "0 14px", padding: "10px 18px",
                                borderBottom: "1px solid var(--border)", alignItems: "center",
                                background: log.slow ? "rgba(248,113,113,0.04)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                            }}>
                                <span style={{ fontSize: "0.8rem" }}>{log.slow ? "🐢" : "✅"}</span>
                                <span style={{ fontWeight: 600, fontSize: "0.84rem" }}>{log.model}</span>
                                <span style={{ fontFamily: "monospace", color: "var(--accent)", fontSize: "0.8rem" }}>{log.operation}</span>
                                <DurationBar ms={log.durationMs} max={maxMs} />
                                <span style={{ fontSize: "0.73rem", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 })}
                                </span>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Stats tab ────────── */}
            {tab === "stats" && (
                stats.length === 0 ? (
                    <div className="glass" style={{ padding: "60px", textAlign: "center" }}>
                        <div style={{ fontSize: "2.5rem", opacity: 0.3, marginBottom: "12px" }}>📊</div>
                        <p style={{ color: "var(--text-muted)" }}>No stats yet.</p>
                    </div>
                ) : (
                    <div className="glass" style={{ overflow: "hidden" }}>
                        <div style={{
                            display: "grid", gridTemplateColumns: "1fr 1fr 50px 60px 60px 100px 60px",
                            gap: "0 12px", padding: "8px 18px",
                            background: "var(--surface2)", borderBottom: "1px solid var(--border)",
                            fontSize: "0.69rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                        }}>
                            <span>Model</span><span>Operation</span><span style={{ textAlign: "right" }}>Count</span>
                            <span style={{ textAlign: "right" }}>Min</span><span style={{ textAlign: "right" }}>Max</span>
                            <span>Avg (bar)</span><span style={{ textAlign: "right" }}>Slow</span>
                        </div>
                        {stats.map(s => <StatsRow key={`${s.model}.${s.operation}`} s={s} maxAvg={maxAvgMs} />)}
                    </div>
                )
            )}

            {/* Technique note */}
            <div style={{
                marginTop: "20px", padding: "14px 18px", borderRadius: "var(--radius)",
                background: "rgba(124,111,247,0.05)", border: "1px solid rgba(124,111,247,0.15)",
                fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.7,
            }}>
                <span style={{ fontWeight: 600, color: "var(--accent)" }}>Optimizations: </span>
                O(1) circular ring buffer insert (head-index, no array shifts) ·
                Per-op stats updated in-place on each query (single-pass) ·
                Incremental <code style={{ background: "var(--surface2)", padding: "0 4px", borderRadius: "3px" }}>?since=</code>
                {" "}polling sends only new entries — zero bytes transferred when idle
            </div>
        </div>
    );
}
