export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    // Verify task access
    const existing = await prisma.task.findUnique({
        where: { id: Number(id) },
        select: { sprint: { select: { project: { select: { organizationId: true } } } } },
    });
    if (!existing || !orgIds.includes(existing.sprint.project.organizationId)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const todo = await prisma.task.update({
        where: { id: Number(id) },
        data: {
            ...(typeof body.title === "string" && { title: body.title.trim() }),
            ...(body.status && { status: body.status }),
        },
    });
    return NextResponse.json(todo);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    const existing = await prisma.task.findUnique({
        where: { id: Number(id) },
        select: { sprint: { select: { project: { select: { organizationId: true } } } } },
    });
    if (!existing || !orgIds.includes(existing.sprint.project.organizationId)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
