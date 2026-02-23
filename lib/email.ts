/**
 * lib/email.ts — Email notifications via Resend API
 *
 * Sends transactional emails for task events (assigned, status changed, etc.)
 * Uses the Resend REST API directly — no SDK dependency needed.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "SprintHive <onboarding@resend.dev>";

type EmailPayload = {
    to: string;
    subject: string;
    html: string;
};

export async function sendEmail({ to, subject, html }: EmailPayload) {
    if (!RESEND_API_KEY) {
        console.warn("[Email] RESEND_API_KEY not set — skipping email to", to);
        return;
    }

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[Email] Failed to send:", res.status, err);
        }
    } catch (err) {
        console.error("[Email] Error sending email:", err);
    }
}

// ── Email Templates ──────────────────────────────────────

export function taskAssignedEmail(taskTitle: string, assignerName: string, taskUrl?: string) {
    return {
        subject: `📋 You've been assigned: ${taskTitle}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #7c6ff7;">New Task Assignment</h2>
                <p><strong>${assignerName}</strong> assigned you a task:</p>
                <div style="background: #1a1a2e; color: #fff; padding: 16px 20px; border-radius: 10px; margin: 16px 0;">
                    <strong>${taskTitle}</strong>
                </div>
                ${taskUrl ? `<a href="${taskUrl}" style="color: #7c6ff7;">View Task →</a>` : ""}
                <p style="color: #888; font-size: 0.85em; margin-top: 24px;">— SprintHive Notifications</p>
            </div>
        `,
    };
}

export function taskStatusChangedEmail(
    taskTitle: string,
    oldStatus: string,
    newStatus: string,
    changedByName: string
) {
    return {
        subject: `🔄 Task updated: ${taskTitle} → ${newStatus}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #7c6ff7;">Task Status Changed</h2>
                <p><strong>${changedByName}</strong> updated a task:</p>
                <div style="background: #1a1a2e; color: #fff; padding: 16px 20px; border-radius: 10px; margin: 16px 0;">
                    <strong>${taskTitle}</strong><br/>
                    <span style="color: #f87171;">${oldStatus}</span> → <span style="color: #6ee7b7;">${newStatus}</span>
                </div>
                <p style="color: #888; font-size: 0.85em; margin-top: 24px;">— SprintHive Notifications</p>
            </div>
        `,
    };
}
