export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");
    const assigneeId = searchParams.get("assigneeId");
    const cursorId = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const paginate = limitParam !== null || cursorId !== null;
    const limit = Math.min(Number(limitParam ?? 20), 100);

    const where = {
        deletedAt: null,
        ...(sprintId && { sprintId: Number(sprintId) }),
        ...(assigneeId && { assigneeId: Number(assigneeId) }),
        sprint: { project: { organizationId: { in: orgIds } } },
    };

    const include = {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        labels: { include: { label: true } },
        _count: { select: { comments: true } },
    };

    if (!paginate) {
        const tasks = await prisma.task.findMany({
            where,
            include,
            orderBy: { createdAt: "asc" },
        });
        return NextResponse.json(tasks);
    }

    const tasks = await prisma.task.findMany({
        take: limit + 1,
        ...(cursorId && {
            cursor: { id: Number(cursorId) },
            skip: 1,
        }),
        where,
        include,
        orderBy: { createdAt: "asc" },
    });

    const hasMore = tasks.length > limit;
    const data = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor, hasMore });
}

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { title, description, sprintId, assigneeId, priority, dueDate, labelIds, status } =
        await req.json();

    if (!title || !sprintId) {
        return NextResponse.json({ error: "title and sprintId required" }, { status: 400 });
    }

    // Verify sprint belongs to user's org
    const sprint = await prisma.sprint.findUnique({
        where: { id: Number(sprintId) },
        select: { project: { select: { organizationId: true } } },
    });
    if (!sprint || !orgIds.includes(sprint.project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify assignee is a member of the organization
    if (assigneeId) {
        const assigneeMembership = await prisma.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: Number(assigneeId),
                    organizationId: sprint.project.organizationId,
                },
            },
        });
        if (!assigneeMembership) {
            return NextResponse.json(
                { error: "Assignee is not a member of this organization" },
                { status: 400 }
            );
        }
    }

    const task = await prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
            data: {
                title,
                description,
                sprintId: Number(sprintId),
                creatorId: user.id,   // use authenticated user
                ...(status && { status }),
                ...(assigneeId && { assigneeId: Number(assigneeId) }),
                ...(priority && { priority }),
                ...(dueDate && { dueDate: new Date(dueDate) }),
            },
        });
        if (labelIds?.length) {
            await tx.taskLabel.createMany({
                data: labelIds.map((labelId: number) => ({ taskId: task.id, labelId })),
            });
        }
        return task;
    });

    const full = await prisma.task.findUnique({
        where: { id: task.id },
        include: {
            creator: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true, email: true } },
            labels: { include: { label: true } },
            _count: { select: { comments: true } },
        },
    });

    // Send email notification to assignee
    if (assigneeId && full?.assignee?.email) {
        const tmpl = taskAssignedEmail(title, user.name);
        sendEmail({ to: full.assignee.email, ...tmpl }).catch(() => { });
    }

    return NextResponse.json(full, { status: 201 });
}
