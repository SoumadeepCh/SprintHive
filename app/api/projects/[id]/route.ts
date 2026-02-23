export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id: Number(id) },
        include: {
            organization: { select: { id: true, name: true } },
            sprints: {
                include: { _count: { select: { tasks: true } } },
                orderBy: { createdAt: "desc" },
            },
            labels: true,
        },
    });
    if (!project || !orgIds.includes(project.organizationId)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    const existing = await prisma.project.findUnique({
        where: { id: Number(id) },
        select: { organizationId: true },
    });
    if (!existing || !orgIds.includes(existing.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const project = await prisma.project.update({
        where: { id: Number(id) },
        data: {
            ...(body.name && { name: body.name }),
            ...(body.description !== undefined && { description: body.description }),
        },
    });
    return NextResponse.json(project);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    const existing = await prisma.project.findUnique({
        where: { id: Number(id) },
        select: { organizationId: true },
    });
    if (!existing || !orgIds.includes(existing.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.project.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
