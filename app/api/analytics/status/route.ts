export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");

    if (!sprintId) {
        return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
    }

    // Verify sprint belongs to user's org
    const sprint = await prisma.sprint.findUnique({
        where: { id: Number(sprintId) },
        select: { project: { select: { organizationId: true } } },
    });
    if (!sprint || !orgIds.includes(sprint.project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const groups = await prisma.task.groupBy({
        by: ["status"],
        where: {
            sprintId: Number(sprintId),
            deletedAt: null,
        },
        _count: { id: true },
        orderBy: { status: "asc" },
    });

    const data = groups.map((g) => ({
        status: g.status,
        count: g._count.id,
    }));

    return NextResponse.json(data);
}