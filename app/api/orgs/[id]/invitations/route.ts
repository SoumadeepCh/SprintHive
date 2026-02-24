export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { sendEmail, orgInvitationEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

// GET: list pending invitations for this org
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;
    const orgId = Number(id);

    if (!orgIds.includes(orgId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invitations = await prisma.orgInvitation.findMany({
        where: { organizationId: orgId },
        include: { inviter: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invitations);
}

// POST: send an invitation to an email
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;
    const orgId = Number(id);

    if (!orgIds.includes(orgId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
    if (existingUser) {
        const existingMembership = await prisma.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: existingUser.id,
                    organizationId: orgId,
                },
            },
        });
        if (existingMembership) {
            return NextResponse.json(
                { error: "User is already a member of this organization" },
                { status: 400 }
            );
        }
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.orgInvitation.findFirst({
        where: { email, organizationId: orgId, status: "PENDING" },
    });
    if (existingInvite) {
        return NextResponse.json(
            { error: "An invitation is already pending for this email" },
            { status: 400 }
        );
    }

    // Get org name for email
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
    });
    if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Create invitation
    const invitation = await prisma.orgInvitation.create({
        data: {
            email,
            organizationId: orgId,
            inviterId: user.id,
        },
        include: { inviter: { select: { id: true, name: true } } },
    });

    // Build accept/decline URLs
    const baseUrl = process.env.APP_URL ?? req.headers.get("origin") ?? "http://localhost:3000";
    const acceptUrl = `${baseUrl}/invitations/${invitation.token}`;
    const declineUrl = `${baseUrl}/invitations/${invitation.token}?action=decline`;

    // Send invitation email
    const tmpl = orgInvitationEmail(org.name, user.name, acceptUrl, declineUrl);
    sendEmail({ to: email, ...tmpl }).catch(() => { });

    return NextResponse.json(invitation, { status: 201 });
}

// DELETE: cancel a pending invitation
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;
    const orgId = Number(id);

    if (!orgIds.includes(orgId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const invitationId = Number(searchParams.get("invitationId"));

    if (!invitationId) {
        return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
    }

    const invitation = await prisma.orgInvitation.findUnique({
        where: { id: invitationId },
    });

    if (!invitation || invitation.organizationId !== orgId) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
        return NextResponse.json(
            { error: `Cannot cancel — invitation is already ${invitation.status.toLowerCase()}` },
            { status: 400 }
        );
    }

    await prisma.orgInvitation.delete({ where: { id: invitationId } });

    return NextResponse.json({ success: true });
}
