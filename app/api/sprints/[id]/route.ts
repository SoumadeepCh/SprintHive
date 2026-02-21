import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const sprint = await prisma.sprint.findUnique({
        where: { id: Number(id) },
        include: {
            project: { select: { id: true, name: true, organizationId: true } },
            tasks: {
                where: { deletedAt: null },
                include: {
                    creator: { select: { id: true, name: true } },
                    assignee: { select: { id: true, name: true } },
                    labels: { include: { label: true } },
                    _count: { select: { comments: true } },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });
    if (!sprint) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(sprint);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    // Handle sprint activation: deactivate sibling sprints first
    if (body.isActive === true) {
        const sprint = await prisma.sprint.findUnique({ where: { id: Number(id) } });
        if (sprint) {
            await prisma.sprint.updateMany({
                where: { projectId: sprint.projectId, isActive: true },
                data: { isActive: false },
            });
        }
    }
    const sprint = await prisma.sprint.update({
        where: { id: Number(id) },
        data: {
            ...(body.name && { name: body.name }),
            ...(body.isActive !== undefined && { isActive: body.isActive }),
            ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
            ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        },
    });
    return NextResponse.json(sprint);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.sprint.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
