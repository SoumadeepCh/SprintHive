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

    const sprints = await prisma.sprint.findMany({
        where: {
            ...(projectId ? { projectId: Number(projectId) } : {}),
            project: { organizationId: { in: orgIds } },
        },
        include: { _count: { select: { tasks: true } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sprints);
}

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { name, projectId, startDate, endDate } = await req.json();

    if (!name || !projectId) {
        return NextResponse.json({ error: "name and projectId required" }, { status: 400 });
    }

    // Verify user has access to the project's org
    const project = await prisma.project.findUnique({
        where: { id: Number(projectId) },
        select: { organizationId: true },
    });
    if (!project || !orgIds.includes(project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sprint = await prisma.sprint.create({
        data: {
            name,
            projectId: Number(projectId),
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        },
    });
    return NextResponse.json(sprint, { status: 201 });
}
