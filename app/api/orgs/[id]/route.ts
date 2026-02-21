import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const org = await prisma.organization.findUnique({
        where: { id: Number(id) },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            members: { select: { id: true, name: true, email: true } },
            projects: {
                include: { _count: { select: { sprints: true } } },
                orderBy: { createdAt: "desc" },
            },
        },
    });
    if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(org);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { name } = await req.json();
    const org = await prisma.organization.update({
        where: { id: Number(id) },
        data: { name },
    });
    return NextResponse.json(org);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.organization.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
