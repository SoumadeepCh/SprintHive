export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET: return all tasks assigned to the current authenticated user
export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const tasks = await prisma.task.findMany({
        where: {
            assigneeId: user.id,
            deletedAt: null,
            project: { organizationId: { in: orgIds } },
            ...(statusFilter && { status: statusFilter as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" }),
        },
        include: {
            creator: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            sprint: {
                select: {
                    id: true,
                    name: true,
                },
            },
            project: { select: { id: true, name: true, key: true } },
            _count: { select: { comments: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(tasks);
}
