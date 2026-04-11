"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TaskResult = {
    id: number; key: string | null; title: string; description: string | null;
    status: string; priority: string; issue_type: string; project_id: number; project_name: string; sprint_id: number | null; sprint_name: string | null; rank: number;
};
type ProjectResult = { id: number; name: string; description: string | null; sprint_count: number };
type SprintResult = { id: number; name: string; project_id: number; project_name: string; is_active: boolean; task_count: number };
type Results = { query: string; tasks: TaskResult[]; projects: ProjectResult[]; sprints: SprintResult[] };

const STATUS_COLOR: Record<string, string> = {
    TODO: "#9292b0", IN_PROGRESS: "#a78bfa", REVIEW: "#fcd34d", DONE: "#6ee7b7",
};
const PRIORITY_COLOR: Record<string, string> = {
    LOW: "#6ee7b7", MEDIUM: "#fbbf24", HIGH: "#f97316", URGENT: "#f87171",
};

/** Highlight matching substring with <mark> */
function Highlight({ text, q }: { text: string; q: string }) {
    if (!q || !text) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <>{text}</>;
    return (
        <>
            {text.slice(0, idx)}
            <mark style={{ background: "rgba(167,139,250,0.35)", color: "inherit", borderRadius: "2px", padding: "0 2px" }}>
                {text.slice(idx, idx + q.length)}
            </mark>
            {text.slice(idx + q.length)}
        </>
    );
}

function SectionHeader({ icon, label, count }: { icon: string; label: string; count: number }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", marginTop: "28px" }}>
            <span style={{ fontSize: "1rem" }}>{icon}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {label}
            </span>
            <span style={{ padding: "1px 8px", borderRadius: "20px", background: "var(--surface2)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                {count}
            </span>
        </div>
    );
}

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Results | null>(null);
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => { inputRef.current?.focus(); }, []);

    const search = useCallback(async (q: string) => {
        if (q.length < 2) { setResults(null); setLoading(false); return; }
        setLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
        setLoading(false);
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setQuery(q);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (q.length < 2) { setResults(null); setLoading(false); return; }
        setLoading(true);
        debounceRef.current = setTimeout(() => search(q), 300);
    };

    const total = results
        ? results.tasks.length + results.projects.length + results.sprints.length
        : 0;

    return (
        <div style={{ padding: "36px 48px", maxWidth: "860px", margin: "0 auto" }} className="page-enter">
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <span>›</span>
                <span>Search</span>
            </div>

            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "20px" }}>
                🔍 Full-text Search
            </h1>

            {/* Search input */}
            <div style={{
                position: "relative",
                marginBottom: "8px",
            }}>
                <input
                    ref={inputRef}
                    value={query}
                    onChange={handleInput}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="Search tasks, projects, sprints…"
                    style={{
                        width: "100%",
                        padding: "14px 48px 14px 20px",
                        borderRadius: "var(--radius)",
                        border: `1.5px solid ${focused ? "var(--accent)" : "var(--border)"}`,
                        background: "var(--surface2)",
                        color: "var(--text)",
                        fontSize: "1rem",
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box",
                    }}
                />
                <div style={{
                    position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)",
                    color: "var(--text-muted)", fontSize: "0.75rem", pointerEvents: "none",
                }}>
                    {loading ? <span className="refresh-dot" /> : "⌘K"}
                </div>
            </div>

            {/* Technique note */}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                PostgreSQL{" "}
                <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: "3px" }}>to_tsvector</code>{" "}+{" "}
                <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: "3px" }}>plainto_tsquery</code>
                {" "}ranked by <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: "3px" }}>ts_rank</code>
                {" "}· falls back to <code style={{ background: "var(--surface2)", padding: "1px 5px", borderRadius: "3px" }}>ILIKE</code>
            </p>

            {/* Empty state */}
            {query.length === 0 && (
                <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "3rem", opacity: 0.2, marginBottom: "12px" }}>🔍</div>
                    <p>Type at least 2 characters to search across all tasks, projects, and sprints.</p>
                </div>
            )}

            {/* No results */}
            {results && total === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: "2.5rem", opacity: 0.25, marginBottom: "12px" }}>∅</div>
                    <p>No results for <strong>"{results.query}"</strong></p>
                </div>
            )}

            {/* Results */}
            {results && total > 0 && (
                <div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "16px 0 0" }}>
                        {total} result{total !== 1 ? "s" : ""} for <strong>"{results.query}"</strong>
                    </p>

                    {/* Tasks */}
                    {results.tasks.length > 0 && (
                        <div>
                            <SectionHeader icon="📋" label="Tasks" count={results.tasks.length} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {results.tasks.map(t => (
                                    <Link key={t.id} href={t.sprint_id ? `/sprints/${t.sprint_id}` : `/projects/${t.project_id}/backlog`} style={{ display: "block" }}>
                                        <div className="glass kanban-card" style={{ padding: "14px 18px", cursor: "pointer" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: PRIORITY_COLOR[t.priority], flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>
                                                        <span style={{ color: "var(--accent)", marginRight: "8px", fontWeight: 700 }}>{t.key ?? `#${t.id}`}</span>
                                                        <Highlight text={t.title} q={query} />
                                                    </div>
                                                    {t.description && (
                                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "600px" }}>
                                                            <Highlight text={t.description} q={query} />
                                                        </div>
                                                    )}
                                                </div>
                                                <span style={{ padding: "2px 9px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 600, background: `${STATUS_COLOR[t.status]}22`, color: STATUS_COLOR[t.status], flexShrink: 0 }}>
                                                    {t.status.replace("_", " ")}
                                                </span>
                                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0 }}>
                                                    {t.sprint_name ?? "Backlog"}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Projects */}
                    {results.projects.length > 0 && (
                        <div>
                            <SectionHeader icon="◈" label="Projects" count={results.projects.length} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {results.projects.map(p => (
                                    <Link key={p.id} href={`/projects/${p.id}`} style={{ display: "block" }}>
                                        <div className="glass kanban-card" style={{ padding: "14px 18px", cursor: "pointer" }}>
                                            <div style={{ fontWeight: 600, marginBottom: "2px" }}><Highlight text={p.name} q={query} /></div>
                                            {p.description && (
                                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}><Highlight text={p.description} q={query} /></div>
                                            )}
                                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>🏃 {p.sprint_count} sprint{p.sprint_count !== 1 ? "s" : ""}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sprints */}
                    {results.sprints.length > 0 && (
                        <div>
                            <SectionHeader icon="🏃" label="Sprints" count={results.sprints.length} />
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {results.sprints.map(s => (
                                    <Link key={s.id} href={`/sprints/${s.id}`} style={{ display: "block" }}>
                                        <div className="glass kanban-card" style={{ padding: "14px 18px", cursor: "pointer" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600 }}>
                                                        <Highlight text={s.name} q={query} />
                                                        {s.is_active && (
                                                            <span style={{ marginLeft: "8px", padding: "1px 7px", borderRadius: "20px", fontSize: "0.68rem", background: "rgba(110,231,183,0.15)", color: "#6ee7b7", fontWeight: 600 }}>Active</span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.project_name}</div>
                                                </div>
                                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.task_count} tasks</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
