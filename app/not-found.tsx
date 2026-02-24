import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div style={{
            minHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
        }}>
            <div style={{ textAlign: "center", maxWidth: "480px" }}>
                {/* Glowing 404 */}
                <div style={{
                    fontSize: "7rem",
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                    background: "linear-gradient(135deg, #7c6ff7 0%, #6ee7b7 50%, #a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: "8px",
                    filter: "drop-shadow(0 0 40px rgba(124,111,247,0.3))",
                }}>
                    404
                </div>

                <div style={{ margin: "0 auto 24px", display: "flex", justifyContent: "center" }}>
                    <FileQuestion size={40} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                </div>

                <h1 style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    marginBottom: "10px",
                    color: "#e2e2e2",
                }}>
                    Page Not Found
                </h1>

                <p style={{
                    color: "var(--text-muted)",
                    fontSize: "0.95rem",
                    marginBottom: "36px",
                    lineHeight: 1.6,
                }}>
                    The page you're looking for doesn't exist or has been moved.
                    Check the URL or head back to the dashboard.
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <Link
                        href="/"
                        className="btn-primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px" }}
                    >
                        <Home size={16} /> Dashboard
                    </Link>
                    <Link
                        href="javascript:history.back()"
                        className="btn-ghost"
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px" }}
                    >
                        <ArrowLeft size={16} /> Go Back
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
                    background: "radial-gradient(circle, rgba(124,111,247,0.08) 0%, transparent 70%)",
                    pointerEvents: "none",
                    zIndex: -1,
                }} />
            </div>
        </div>
    );
}
