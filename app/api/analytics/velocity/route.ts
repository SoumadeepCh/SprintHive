import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/velocity?projectId=
 *
 * Uses raw SQL with PostgreSQL FILTER aggregate to get per-sprint
 * task completion counts. Demonstrates advanced raw query usage.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Raw SQL: Count DONE vs total tasks per sprint — uses FILTER (WHERE ...)
    // which is a PostgreSQL-specific aggregate modifier for conditional counting.
    const rows = await prisma.$queryRaw<
        {
            id: bigint;
            name: string;
            completed: bigint;
            total: bigint;
            startDate: Date | null;
            endDate: Date | null;
        }[]
    >(
        Prisma.sql`
        SELECT
            s.id,
            s.name,
            COUNT(t.id) FILTER (WHERE t.status = 'DONE')  AS completed,
            COUNT(t.id)                                    AS total,
            s."startDate",
            s."endDate"
        FROM "Sprint" s
        LEFT JOIN "Task" t
            ON t."sprintId" = s.id
            AND t."deletedAt" IS NULL
        WHERE s."projectId" = ${Number(projectId)}
        GROUP BY s.id, s.name, s."startDate", s."endDate"
        ORDER BY s."createdAt" ASC
        `
    );

    // BigInt can't be JSON-serialized natively; convert to numbers.
    const data = rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        completed: Number(r.completed),
        total: Number(r.total),
        startDate: r.startDate,
        endDate: r.endDate,
    }));

    return NextResponse.json(data);
}
