export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const task = await prisma.task.findUnique({
        where: { id: Number(id), deletedAt: null },
        include: {
            creator: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            comments: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: "asc" },
            },
            sprint: { select: { id: true, name: true, projectId: true } },
        },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(task);
}

/**
 * PATCH /api/tasks/[id]
 *
 * Phase 3 optimization — OPTIMISTIC CONCURRENCY via updateMany:
 *
 * Original approach: prisma.task.update({ where: { id, version } }) and catch P2025.
 * Problem: using exceptions for control flow is an antipattern — try/catch has overhead
 *          and the semantics are unclear ("not found" could mean id doesn't exist OR
 *          version mismatch; P2025 doesn't distinguish these cases).
 *
 * Optimized approach: prisma.task.updateMany({ where: { id, version } })
 *   → updateMany returns { count: N } without throwing when 0 rows match.
 *   → count === 0 unambiguously means version conflict (if we pre-check id exists).
 *   → No try/catch needed.  Cleaner, explicit, slightly faster.
 *
 * Two-step when version is provided:
 *   1. updateMany with version guard → check count
 *   2. findUnique to get full updated record with relations (updateMany has no include)
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    const { version, ...updates } = body;

    const data: Record<string, unknown> = {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.assigneeId !== undefined && { assigneeId: updates.assigneeId ? Number(updates.assigneeId) : null }),
        ...(updates.sprintId !== undefined && { sprintId: Number(updates.sprintId) }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
    };

    const taskId = Number(id);

    if (version !== undefined) {
        // ── Optimistic concurrency path ─────────────────────────────
        // updateMany returns { count } — zero exceptions, explicit semantics.
        const { count } = await prisma.task.updateMany({
            where: { id: taskId, version: Number(version) },
            data: { ...data, version: { increment: 1 } },
        });

        if (count === 0) {
            // Distinguish: does the task exist at all?
            const exists = await prisma.task.findUnique({
                where: { id: taskId },
                select: { id: true },
            });
            if (!exists) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 });
            }
            // Task exists but version didn't match → conflict
            return NextResponse.json(
                {
                    error: "Version conflict — task was modified by another request.",
                    code: "VERSION_CONFLICT",
                    hint: "Re-fetch the task to get the latest version and retry.",
                },
                { status: 409 }
            );
        }

        // Fetch full record (updateMany has no `include`)
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                creator: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
                labels: { include: { label: true } },
                _count: { select: { comments: true } },
            },
        });
        return NextResponse.json(task);
    }

    // ── Legacy path (no version provided) ────────────────────────────
    const task = await prisma.task.update({
        where: { id: taskId },
        data,
        include: {
            creator: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            _count: { select: { comments: true } },
        },
    });
    return NextResponse.json(task);
}

// Soft delete
export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.task.update({
        where: { id: Number(id) },
        data: { deletedAt: new Date() },
    });
    return NextResponse.json({ success: true });
}
