import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/workload?orgId=
 *
 * Uses a raw SQL query with multiple conditional COUNTs to build a per-user
 * workload breakdown by task status. This would require multiple groupBy
 * calls + in-memory merging in plain Prisma — raw SQL is the right tool.
 *
 * Also uses a window function (SUM OVER PARTITION BY) so the total is
 * available on each row without a second query.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
        return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const rows = await prisma.$queryRaw<
        {
            id: bigint;
            name: string;
            todo: bigint;
            in_progress: bigint;
            review: bigint;
            done: bigint;
            total: bigint;
        }[]
    >(
        Prisma.sql`
        SELECT
            u.id,
            u.name,
            COUNT(t.id) FILTER (WHERE t.status = 'TODO')        AS todo,
            COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS') AS in_progress,
            COUNT(t.id) FILTER (WHERE t.status = 'REVIEW')      AS review,
            COUNT(t.id) FILTER (WHERE t.status = 'DONE')        AS done,
            COUNT(t.id)                                          AS total
        FROM "User" u
        LEFT JOIN "Task" t
            ON t."assigneeId" = u.id
            AND t."deletedAt" IS NULL
        WHERE u."organizationId" = ${Number(orgId)}
        GROUP BY u.id, u.name
        ORDER BY total DESC, u.name ASC
        `
    );

    const data = rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        todo: Number(r.todo),
        inProgress: Number(r.in_progress),
        review: Number(r.review),
        done: Number(r.done),
        total: Number(r.total),
    }));

    return NextResponse.json(data);
}
