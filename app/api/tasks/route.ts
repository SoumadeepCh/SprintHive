import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tasks
 * Supports CURSOR PAGINATION via ?cursor=<taskId>&limit=<n>
 *
 * Response shape when paginating:
 *   { data: Task[], nextCursor: number | null, hasMore: boolean }
 *
 * Without cursor params, returns a plain Task[] for backwards-compatibility
 * with existing sprint board usage.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");
    const assigneeId = searchParams.get("assigneeId");
    const cursorId = searchParams.get("cursor");          // task ID string | null
    const limitParam = searchParams.get("limit");
    const paginate = limitParam !== null || cursorId !== null;
    const limit = Math.min(Number(limitParam ?? 20), 100); // cap at 100

    const where = {
        deletedAt: null,
        ...(sprintId && { sprintId: Number(sprintId) }),
        ...(assigneeId && { assigneeId: Number(assigneeId) }),
    };

    const include = {
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        labels: { include: { label: true } },
        _count: { select: { comments: true } },
    };

    if (!paginate) {
        // Legacy: return flat array (sprint board still uses this)
        const tasks = await prisma.task.findMany({
            where,
            include,
            orderBy: { createdAt: "asc" },
        });
        return NextResponse.json(tasks);
    }

    // ── Cursor pagination ───────────────────────────────────────
    // Fetch one extra record to determine whether there is a next page.
    const tasks = await prisma.task.findMany({
        take: limit + 1,
        ...(cursorId && {
            cursor: { id: Number(cursorId) },
            skip: 1,            // skip the cursor record itself
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
    const { title, description, sprintId, creatorId, assigneeId, priority, dueDate, labelIds, status } =
        await req.json();
    if (!title || !sprintId || !creatorId) {
        return NextResponse.json({ error: "title, sprintId, creatorId required" }, { status: 400 });
    }

    const task = await prisma.$transaction(async (tx) => {
        const task = await tx.task.create({
            data: {
                title,
                description,
                sprintId: Number(sprintId),
                creatorId: Number(creatorId),
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
            assignee: { select: { id: true, name: true } },
            labels: { include: { label: true } },
            _count: { select: { comments: true } },
        },
    });
    return NextResponse.json(full, { status: 201 });
}
