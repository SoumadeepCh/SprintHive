"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShieldAlert, RotateCcw, Home, ArrowLeft } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[App Error]", error);
    }, [error]);

    return (
        <div style={{
            minHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
        }}>
            <div style={{ textAlign: "center", maxWidth: "480px" }}>
                {/* Icon */}
                <div style={{
                    width: "80px", height: "80px", borderRadius: "0px",
                    background: "var(--surface)", border: "4px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 24px",
                }}>
                    <ShieldAlert size={36} style={{ color: "#f87171" }} />
                </div>

                <h1 style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    marginBottom: "10px",
                    color: "#e2e2e2",
                }}>
                    Something Went Wrong
                </h1>

                <p style={{
                    color: "var(--text-muted)",
                    fontSize: "0.95rem",
                    marginBottom: "12px",
                    lineHeight: 1.6,
                }}>
                    An unexpected error occurred. You can try again or head back to the dashboard.
                </p>

                {error.digest && (
                    <p style={{
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        marginBottom: "28px",
                        fontFamily: "monospace",
                        background: "rgba(255,255,255,0.03)",
                        padding: "6px 14px",
                        borderRadius: "0px",
                        display: "inline-block",
                    }}>
                        Error ID: {error.digest}
                    </p>
                )}

                <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "8px" }}>
                    <button
                        className="btn-primary"
                        onClick={reset}
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px" }}
                    >
                        <RotateCcw size={16} /> Try Again
                    </button>
                    <Link
                        href="/"
                        className="btn-ghost"
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px" }}
                    >
                        <Home size={16} /> Dashboard
                    </Link>
                </div>

                {/* Decorative background glow */}
                <div style={{
                    position: "fixed",
                    top: "30%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "400px",
                    height: "400px",
                    background: "radial-gradient(circle, rgba(248,113,113,0.06) 0%, transparent 70%)",
                    pointerEvents: "none",
                    zIndex: -1,
                }} />
            </div>
        </div>
    );
}
