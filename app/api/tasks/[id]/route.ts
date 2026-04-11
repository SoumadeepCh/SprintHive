export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { logTaskActivity } from "@/lib/activity";
import { sendEmail, taskStatusChangedEmail, taskAssignedEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

async function verifyTaskAccess(taskId: number, orgIds: number[]) {
    const task = await prisma.task.findUnique({
        where: { id: taskId, deletedAt: null },
        include: {
            project: { select: { organizationId: true } },
        },
    });
    if (!task || !orgIds.includes(task.project.organizationId)) return null;
    return task;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    const access = await verifyTaskAccess(Number(id), orgIds);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const task = await prisma.task.findUnique({
        where: { id: Number(id), deletedAt: null },
        include: {
            creator: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, key: true } },
            labels: { include: { label: true } },
            comments: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: "asc" },
            },
            activities: { orderBy: { createdAt: "desc" }, take: 20 },
            parent: { select: { id: true, key: true, title: true, issueType: true } },
            sprint: { select: { id: true, name: true, projectId: true } },
        },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(task);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;
    const taskId = Number(id);

    const access = await verifyTaskAccess(taskId, orgIds);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const { version, ...updates } = body;

    const data: Record<string, unknown> = {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.issueType !== undefined && { issueType: updates.issueType }),
        ...(updates.storyPoints !== undefined && { storyPoints: updates.storyPoints === "" ? null : Number(updates.storyPoints) }),
        ...(updates.parentId !== undefined && { parentId: updates.parentId ? Number(updates.parentId) : null }),
        ...(updates.assigneeId !== undefined && { assigneeId: updates.assigneeId ? Number(updates.assigneeId) : null }),
        ...(updates.sprintId !== undefined && { sprintId: updates.sprintId ? Number(updates.sprintId) : null }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
    };

    // Verify assignee is a member of the task's organization
    if (updates.assigneeId) {
        const orgId = access.project.organizationId;
        const assigneeMembership = await prisma.userOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: Number(updates.assigneeId),
                    organizationId: orgId,
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

    // Track old values for notifications
    const oldTask = await prisma.task.findUnique({
        where: { id: taskId },
        select: {
            title: true,
            description: true,
            status: true,
            priority: true,
            issueType: true,
            storyPoints: true,
            assigneeId: true,
            sprintId: true,
            dueDate: true,
            parentId: true,
            creator: { select: { email: true } },
            assignee: { select: { email: true } },
        },
    });

    if (version !== undefined) {
        const { count } = await prisma.task.updateMany({
            where: { id: taskId, version: Number(version) },
            data: { ...data, version: { increment: 1 } },
        });

        if (count === 0) {
            const exists = await prisma.task.findUnique({
                where: { id: taskId },
                select: { id: true },
            });
            if (!exists) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 });
            }
            return NextResponse.json(
                {
                    error: "Version conflict — task was modified by another request.",
                    code: "VERSION_CONFLICT",
                    hint: "Re-fetch the task to get the latest version and retry.",
                },
                { status: 409 }
            );
        }

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                creator: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
                project: { select: { id: true, name: true, key: true } },
                sprint: { select: { id: true, name: true } },
                labels: { include: { label: true } },
                _count: { select: { comments: true } },
            },
        });

        await logFieldActivities(taskId, user, oldTask, updates);
        // Send notifications
        await sendTaskNotifications(oldTask, updates, user.name, task?.title ?? "");

        return NextResponse.json(task);
    }

    const task = await prisma.task.update({
        where: { id: taskId },
        data,
        include: {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, key: true } },
        sprint: { select: { id: true, name: true } },
        labels: { include: { label: true } },
        _count: { select: { comments: true } },
    },
});

    await logFieldActivities(taskId, user, oldTask, updates);
    // Send notifications
    await sendTaskNotifications(oldTask, updates, user.name, task.title);

    return NextResponse.json(task);
}

// Soft delete
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { id } = await params;

    const access = await verifyTaskAccess(Number(id), orgIds);
    if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.task.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() },
    });
    await logTaskActivity({ taskId: Number(id), actor: user, type: "DELETED" });
    return NextResponse.json({ success: true });
}

async function logFieldActivities(
    taskId: number,
    actor: { id: number; name: string },
    oldTask: Record<string, unknown> | null,
    updates: Record<string, unknown>,
) {
    if (!oldTask) return;

    const activityFor = (field: string) => {
        if (updates[field] === undefined || updates[field] === oldTask[field]) return null;
        if (field === "status") return "STATUS_CHANGED" as const;
        if (field === "assigneeId") return "ASSIGNEE_CHANGED" as const;
        if (field === "sprintId") return "SPRINT_CHANGED" as const;
        return "UPDATED" as const;
    };

    for (const field of ["title", "description", "status", "priority", "issueType", "storyPoints", "assigneeId", "sprintId", "dueDate", "parentId"]) {
        const type = activityFor(field);
        if (!type) continue;
        await logTaskActivity({
            taskId,
            actor,
            type,
            field,
            fromValue: oldTask[field],
            toValue: updates[field],
        });
    }
}

// ── Notification helper ──────────────────────────────────
async function sendTaskNotifications(
    oldTask: { status: string; creator: { email: string } | null; assignee: { email: string | null } | null } | null,
    updates: Record<string, unknown>,
    changedByName: string,
    taskTitle: string,
) {
    if (!oldTask) return;

    // Status change → notify creator and assignee
    if (updates.status && updates.status !== oldTask.status) {
        const tmpl = taskStatusChangedEmail(taskTitle, oldTask.status, updates.status as string, changedByName);
        const recipients = [oldTask.creator?.email, oldTask.assignee?.email].filter(Boolean) as string[];
        for (const to of [...new Set(recipients)]) {
            sendEmail({ to, ...tmpl }).catch(() => { });
        }
    }

    // Assignee change → notify new assignee
    if (updates.assigneeId) {
        const newAssignee = await prisma.user.findUnique({
            where: { id: Number(updates.assigneeId) },
            select: { email: true },
        });
        if (newAssignee?.email) {
            const tmpl = taskAssignedEmail(taskTitle, changedByName);
            sendEmail({ to: newAssignee.email, ...tmpl }).catch(() => { });
        }
    }
}
