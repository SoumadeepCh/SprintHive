export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    // Verify project belongs to user's org
    const project = await prisma.project.findUnique({
        where: { id: Number(projectId) },
        select: { organizationId: true },
    });
    if (!project || !orgIds.includes(project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const labels = await prisma.label.findMany({
        where: { projectId: Number(projectId) },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { name, color, projectId } = await req.json();

    if (!name || !projectId) {
        return NextResponse.json({ error: "name and projectId required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
        where: { id: Number(projectId) },
        select: { organizationId: true },
    });
    if (!project || !orgIds.includes(project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const label = await prisma.label.create({
        data: { name, color: color || "#6b7280", projectId: Number(projectId) },
    });
    return NextResponse.json(label, { status: 201 });
}
