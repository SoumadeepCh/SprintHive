export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const sprints = await prisma.sprint.findMany({
        where: projectId ? { projectId: Number(projectId) } : {},
        include: { _count: { select: { tasks: true } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sprints);
}

export async function POST(req: NextRequest) {
    const { name, projectId, startDate, endDate } = await req.json();
    if (!name || !projectId) {
        return NextResponse.json({ error: "name and projectId required" }, { status: 400 });
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
