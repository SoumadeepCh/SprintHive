"use client";

import {
    SignInButton,
    SignUpButton,
} from "@clerk/nextjs";
import {
    Hexagon, Building2, FolderKanban, ListTodo, Zap,
    Users, BarChart3, ArrowRight, Sparkles, Shield
} from "lucide-react";

export default function LandingPage() {
    return (
        <div className="landing-root">
            {/* ── Floating decorations ─────────────────────────── */}
            <div className="landing-glow landing-glow-1" />
            <div className="landing-glow landing-glow-2" />
            <div className="landing-glow landing-glow-3" />

            {/* ── Top nav ─────────────────────────────────────── */}
            <nav className="landing-nav">
                <div className="landing-nav-brand">
                    <Hexagon size={26} style={{ color: "var(--accent)" }} />
                    <span className="landing-nav-title">SprintHive</span>
                </div>
                <div className="landing-nav-actions">
                    <SignInButton>
                        <button className="btn-ghost">Sign In</button>
                    </SignInButton>
                    <SignUpButton>
                        <button className="btn-primary">Get Started Free</button>
                    </SignUpButton>
                </div>
            </nav>

            {/* ── Hero ────────────────────────────────────────── */}
            <section className="landing-hero">
                <div className="landing-badge anim-in">
                    <Sparkles size={13} />
                    <span>Team Sprint Management, Simplified</span>
                </div>
                <h1 className="landing-h1 anim-in" style={{ animationDelay: "0.06s" }}>
                    Ship Faster with<br />
                    <span className="landing-gradient-text">SprintHive</span>
                </h1>
                <p className="landing-subtitle anim-in" style={{ animationDelay: "0.12s" }}>
                    Organize your team, plan sprints, track tasks, and deliver projects
                    on time — all in one beautifully crafted workspace.
                </p>
                <div className="landing-cta anim-in" style={{ animationDelay: "0.18s" }}>
                    <SignUpButton>
                        <button className="btn-primary landing-cta-btn">
                            Start for Free <ArrowRight size={16} />
                        </button>
                    </SignUpButton>
                    <SignInButton>
                        <button className="btn-ghost landing-cta-btn-ghost">
                            Sign In to Dashboard
                        </button>
                    </SignInButton>
                </div>
            </section>

            {/* ── Feature grid ────────────────────────────────── */}
            <section className="landing-features anim-in" style={{ animationDelay: "0.24s" }}>
                <div className="landing-features-header">
                    <h2 className="landing-h2">Everything you need to manage sprints</h2>
                    <p className="landing-features-sub">
                        Built for small teams who want a powerful, beautiful tool without
                        the bloat.
                    </p>
                </div>
                <div className="landing-features-grid">
                    {[
                        {
                            icon: <Building2 size={24} />,
                            title: "Organizations",
                            desc: "Create orgs, invite members, and manage roles with a single click.",
                            color: "var(--primary)",
                        },
                        {
                            icon: <FolderKanban size={24} />,
                            title: "Projects & Sprints",
                            desc: "Break work into projects and time-boxed sprints for focused delivery.",
                            color: "var(--secondary)",
                        },
                        {
                            icon: <ListTodo size={24} />,
                            title: "Task Management",
                            desc: "Kanban boards, priorities, labels, comments, and due dates — all built in.",
                            color: "var(--tertiary)",
                        },
                        {
                            icon: <Users size={24} />,
                            title: "Team Collaboration",
                            desc: "Assign tasks, @mention teammates, and track who's working on what.",
                            color: "var(--primary)",
                        },
                        {
                            icon: <BarChart3 size={24} />,
                            title: "Analytics",
                            desc: "Burndown charts, velocity tracking, and performance insights.",
                            color: "var(--secondary)",
                        },
                        {
                            icon: <Shield size={24} />,
                            title: "User Isolation",
                            desc: "Secure data per-user with Clerk authentication and row-level scoping.",
                            color: "var(--tertiary)",
                        },
                    ].map((f) => (
                        <div key={f.title} className="feature-card glass">
                            <div
                                className="feature-icon"
                                style={{ background: f.color, color: "var(--inverse-surface)", border: "2px solid var(--border)" }}
                            >
                                {f.icon}
                            </div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Bottom CTA ──────────────────────────────────── */}
            <section className="landing-bottom-cta anim-in" style={{ animationDelay: "0.3s" }}>
                <Zap size={28} style={{ color: "var(--accent)" }} />
                <h2 className="landing-h2" style={{ marginTop: "8px" }}>
                    Ready to supercharge your sprints?
                </h2>
                <p className="landing-features-sub" style={{ marginBottom: "28px" }}>
                    Join teams already shipping faster with SprintHive.
                </p>
                <SignUpButton>
                    <button className="btn-primary landing-cta-btn">
                        Get Started — It&apos;s Free <ArrowRight size={16} />
                    </button>
                </SignUpButton>
            </section>

            {/* ── Footer ──────────────────────────────────────── */}
            <footer className="landing-footer">
                <span>© {new Date().getFullYear()} SprintHive</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>Built with Next.js, Prisma & Clerk</span>
            </footer>
        </div>
    );
}
