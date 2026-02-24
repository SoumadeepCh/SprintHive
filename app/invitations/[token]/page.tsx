"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    Handshake, AlertTriangle, MailOpen, PartyPopper, Hand,
    Check, X, ArrowLeft, ChevronRight
} from "lucide-react";

type Invitation = {
    id: number;
    token: string;
    email: string;
    status: string;
    organization: { id: number; name: string };
    inviter: { id: number; name: string };
    createdAt: string;
};

export default function InvitationPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();
    const [invitation, setInvitation] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [acting, setActing] = useState(false);
    const [result, setResult] = useState<"accepted" | "declined" | null>(null);

    useEffect(() => {
        fetch(`/api/invitations/${token}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) setError(data.error);
                else setInvitation(data);
                setLoading(false);
            })
            .catch(() => {
                setError("Failed to load invitation");
                setLoading(false);
            });
    }, [token]);

    const handleAccept = async () => {
        setActing(true);
        const res = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            setResult("accepted");
            toast.success("Welcome aboard!", { description: `You've joined ${invitation?.organization.name}` });
            setTimeout(() => router.push(`/orgs/${data.organizationId}`), 2000);
        } else {
            toast.error("Failed to accept invitation", { description: data.error });
            setError(data.error ?? "Failed to accept");
        }
        setActing(false);
    };

    const handleDecline = async () => {
        setActing(true);
        const res = await fetch(`/api/invitations/${token}/decline`, { method: "POST" });
        const data = await res.json();
        if (data.success) {
            setResult("declined");
            toast.info("Invitation declined");
        } else {
            toast.error("Failed to decline", { description: data.error });
            setError(data.error ?? "Failed to decline");
        }
        setActing(false);
    };

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <p style={{ color: "var(--text-muted)" }}>Loading invitation…</p>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div style={{ padding: "60px 48px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                <AlertTriangle size={40} style={{ margin: "0 auto 16px", opacity: 0.4, color: "var(--danger)" }} />
                <h2 style={{ color: "var(--danger)", marginBottom: "12px" }}>Invitation Error</h2>
                <p style={{ color: "var(--text-muted)" }}>{error}</p>
                <Link href="/" className="btn-ghost" style={{ marginTop: "24px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <ArrowLeft size={14} /> Back to Dashboard
                </Link>
            </div>
        );
    }

    if (!invitation) return null;

    // Already handled
    if (invitation.status !== "PENDING" && !result) {
        return (
            <div style={{ padding: "60px 48px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                <MailOpen size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                <h2 style={{ marginBottom: "12px" }}>Invitation Already {invitation.status.charAt(0) + invitation.status.slice(1).toLowerCase()}</h2>
                <p style={{ color: "var(--text-muted)" }}>
                    This invitation to <strong>{invitation.organization.name}</strong> has already been {invitation.status.toLowerCase()}.
                </p>
                <Link href="/" className="btn-primary" style={{ marginTop: "24px", display: "inline-block" }}>
                    Go to Dashboard
                </Link>
            </div>
        );
    }

    // Success state
    if (result) {
        return (
            <div style={{ padding: "60px 48px", maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                {result === "accepted"
                    ? <PartyPopper size={40} style={{ margin: "0 auto 16px", color: "var(--accent)" }} />
                    : <Hand size={40} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                }
                <h2 style={{
                    marginBottom: "12px",
                    color: result === "accepted" ? "var(--accent)" : "var(--text-muted)",
                }}>
                    {result === "accepted" ? "Welcome Aboard!" : "Invitation Declined"}
                </h2>
                <p style={{ color: "var(--text-muted)" }}>
                    {result === "accepted"
                        ? `You've joined ${invitation.organization.name}. Redirecting…`
                        : `You've declined the invitation to ${invitation.organization.name}.`}
                </p>
                {result === "declined" && (
                    <Link href="/" className="btn-ghost" style={{ marginTop: "24px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <ArrowLeft size={14} /> Back to Dashboard
                    </Link>
                )}
            </div>
        );
    }

    return (
        <div style={{ padding: "60px 48px", maxWidth: "600px", margin: "0 auto" }}>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "32px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                <Link href="/" style={{ color: "var(--accent)" }}>Dashboard</Link>
                <ChevronRight size={14} />
                <span>Invitation</span>
            </div>

            <div className="glass" style={{ padding: "40px", textAlign: "center" }}>
                <Handshake size={36} style={{ margin: "0 auto 20px", color: "var(--accent)" }} />
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "8px" }}>
                    Organization Invitation
                </h1>
                <p style={{ color: "var(--text-muted)", marginBottom: "28px", fontSize: "0.9rem" }}>
                    <strong>{invitation.inviter.name}</strong> invited you to join:
                </p>

                <div style={{
                    background: "linear-gradient(135deg, rgba(124,111,247,0.1), rgba(110,231,183,0.06))",
                    border: "1px solid rgba(124,111,247,0.25)",
                    borderRadius: "var(--radius)",
                    padding: "24px",
                    marginBottom: "32px",
                }}>
                    <div style={{
                        width: "56px", height: "56px", borderRadius: "14px", margin: "0 auto 14px",
                        background: "linear-gradient(135deg, #7c6ff7, #6ee7b7)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "1.5rem", color: "#fff",
                    }}>
                        {invitation.organization.name[0].toUpperCase()}
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{invitation.organization.name}</div>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                        className="btn-primary"
                        onClick={handleAccept}
                        disabled={acting}
                        style={{ padding: "12px 36px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        <Check size={16} /> {acting ? "Joining…" : "Accept & Join"}
                    </button>
                    <button
                        className="btn-ghost"
                        onClick={handleDecline}
                        disabled={acting}
                        style={{ padding: "12px 28px", fontSize: "0.95rem", color: "var(--danger)", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                        <X size={16} /> Decline
                    </button>
                </div>

                <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "24px" }}>
                    Invited on {new Date(invitation.createdAt).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
}
