/**
 * lib/email.ts — Email notifications via Nodemailer + Brevo SMTP
 *
 * Sends transactional emails for task events (assigned, status changed, etc.)
 * Uses Brevo's free SMTP relay — no custom domain required.
 *
 * Env vars needed:
 *   SMTP_HOST     = smtp-relay.brevo.com
 *   SMTP_PORT     = 587
 *   SMTP_USER     = (your Brevo login email)
 *   SMTP_PASS     = (your Brevo SMTP key, NOT the account password)
 *   EMAIL_FROM    = SprintHive <your-email@gmail.com>
 */

import nodemailer from "nodemailer";

const FROM_EMAIL = `"SprintHive" <${process.env.EMAIL_FROM}>`;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp-relay.brevo.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

type EmailPayload = {
    to: string;
    subject: string;
    html: string;
};

export async function sendEmail({ to, subject, html }: EmailPayload) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[Email] SMTP_USER / SMTP_PASS not set — skipping email to", to);
        return;
    }

    try {
        await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
        console.log("[Email] Sent to", to);
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

export function orgInvitationEmail(
    orgName: string,
    inviterName: string,
    acceptUrl: string,
    declineUrl: string
) {
    return {
        subject: `🤝 ${inviterName} invited you to join ${orgName}`,
        html: `
            <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2 style="color: #7c6ff7;">Organization Invitation</h2>
                <p><strong>${inviterName}</strong> has invited you to join:</p>
                <div style="background: #1a1a2e; color: #fff; padding: 16px 20px; border-radius: 10px; margin: 16px 0;">
                    <strong style="font-size: 1.1em;">${orgName}</strong>
                </div>
                <p style="color: #ccc; font-size: 0.9em;">Click below to accept or decline this invitation:</p>
                <div style="margin: 24px 0; display: flex; gap: 12px;">
                    <a href="${acceptUrl}" style="display: inline-block; background: #7c6ff7; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95em;">Accept Invitation</a>
                    <a href="${declineUrl}" style="display: inline-block; background: transparent; color: #f87171; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95em; border: 1px solid #f87171;">Decline</a>
                </div>
                <p style="color: #888; font-size: 0.85em; margin-top: 24px;">— SprintHive Notifications</p>
            </div>
        `,
    };
}
