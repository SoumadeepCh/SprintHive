export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function verifyOrgAccess(orgId: number, userId: number) {
    const membership = await prisma.userOrganization.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    return membership;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const { id } = await params;
    const orgId = Number(id);

    const membership = await verifyOrgAccess(orgId, user.id);
    if (!membership) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            memberships: {
                include: { user: { select: { id: true, name: true, email: true } } },
            },
            projects: {
                include: { _count: { select: { sprints: true } } },
                orderBy: { createdAt: "desc" },
            },
        },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Flatten members from memberships for frontend compatibility
    const members = org.memberships.map((m) => ({ ...m.user, role: m.role }));
    return NextResponse.json({ ...org, members });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const { id } = await params;
    const orgId = Number(id);

    const membership = await verifyOrgAccess(orgId, user.id);
    if (!membership || membership.role !== "OWNER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await req.json();
    const org = await prisma.organization.update({
        where: { id: orgId },
        data: { name },
    });
    return NextResponse.json(org);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const { id } = await params;
    const orgId = Number(id);

    const membership = await verifyOrgAccess(orgId, user.id);
    if (!membership || membership.role !== "OWNER") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.organization.delete({ where: { id: orgId } });
    return NextResponse.json({ success: true });
}
