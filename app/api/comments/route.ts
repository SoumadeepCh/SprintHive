export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { logTaskActivity } from "@/lib/activity";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { content, taskId } = await req.json();

    if (!content || !taskId) {
        return NextResponse.json({ error: "content and taskId required" }, { status: 400 });
    }

    // Verify task access via org chain
    const task = await prisma.task.findUnique({
        where: { id: Number(taskId) },
        select: { project: { select: { organizationId: true } } },
    });
    if (!task || !orgIds.includes(task.project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
        data: { content, taskId: Number(taskId), userId: user.id },
        include: { user: { select: { id: true, name: true } } },
    });
    await logTaskActivity({
        taskId: Number(taskId),
        actor: user,
        type: "COMMENTED",
        toValue: content,
    });
    return NextResponse.json(comment, { status: 201 });
}
