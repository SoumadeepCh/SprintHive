export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { logTaskActivity, nextIssueKey } from "@/lib/activity";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");
    const projectId = searchParams.get("projectId");
    const backlog = searchParams.get("backlog") === "true";
    const assigneeId = searchParams.get("assigneeId");
    const cursorId = searchParams.get("cursor");
    const limitParam = searchParams.get("limit");
    const paginate = limitParam !== null || cursorId !== null;
    const limit = Math.min(Number(limitParam ?? 20), 100);

    const where = {
        deletedAt: null,
        ...(projectId && { projectId: Number(projectId) }),
        ...(sprintId && { sprintId: Number(sprintId) }),
        ...(backlog && { sprintId: null }),
        ...(assigneeId && { assigneeId: Number(assigneeId) }),
        project: { organizationId: { in: orgIds } },
    };

    const include = {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, key: true } },
        sprint: { select: { id: true, name: true } },
        labels: { include: { label: true } },
        _count: { select: { comments: true } },
    };

    if (!paginate) {
        const tasks = await prisma.task.findMany({
            where,
            include,
            orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
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
        orderBy: { id: "asc" },
    });

    const hasMore = tasks.length > limit;
    const data = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor, hasMore });
}

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { title, description, sprintId, projectId, assigneeId, priority, dueDate, labelIds, status, issueType, storyPoints, parentId } =
        await req.json();

    if (!title || (!sprintId && !projectId)) {
        return NextResponse.json({ error: "title and sprintId or projectId required" }, { status: 400 });
    }

    const projectContext = sprintId
        ? await prisma.sprint.findUnique({
            where: { id: Number(sprintId) },
            select: { projectId: true, project: { select: { organizationId: true } } },
        })
        : await prisma.project.findUnique({
            where: { id: Number(projectId) },
            select: { id: true, organizationId: true },
        }).then((project) => project ? { projectId: project.id, project: { organizationId: project.organizationId } } : null);

    if (!projectContext || !orgIds.includes(projectContext.project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify assignee is a member of the organization
    if (assigneeId) {
        const assigneeMembership = await prisma.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: Number(assigneeId),
                    organizationId: projectContext.project.organizationId,
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
                key: await nextIssueKey(projectContext.projectId),
                projectId: projectContext.projectId,
                ...(sprintId && { sprintId: Number(sprintId) }),
                creatorId: user.id,   // use authenticated user
                ...(status && { status }),
                ...(issueType && { issueType }),
                ...(storyPoints !== undefined && storyPoints !== "" && { storyPoints: Number(storyPoints) }),
                ...(parentId && { parentId: Number(parentId) }),
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
            project: { select: { id: true, name: true, key: true } },
            sprint: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            _count: { select: { comments: true } },
        },
    });

    if (full) {
        await logTaskActivity({
            taskId: full.id,
            actor: user,
            type: "CREATED",
            toValue: full.key ?? full.title,
        });
    }

    // Send email notification to assignee
    if (assigneeId && full?.assignee?.email) {
        const tmpl = taskAssignedEmail(title, user.name);
        sendEmail({ to: full.assignee.email, ...tmpl }).catch(() => { });
    }

    return NextResponse.json(full, { status: 201 });
}
