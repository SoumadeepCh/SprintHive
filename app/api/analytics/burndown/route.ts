export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/burndown?sprintId=<id>
 *
 * Returns daily remaining task count for the burn-down chart.
 *
 * Approach:
 *  - Generate a date series from sprint.startDate → min(endDate, TODAY)
 *  - Tasks are considered "completed on day D" if status=DONE AND DATE(updatedAt) = D
 *    (updatedAt is Prisma's auto-managed field — a reasonable proxy for completion time)
 *  - Compute cumulative completions per day; remaining = total − cumulative
 *  - Also return the "ideal" line: linear decrease from total to 0 over sprint duration
 *
 * Note: If sprint has no startDate/endDate we return an empty series.
 */
export async function GET(req: NextRequest) {
    const sprintId = Number(new URL(req.url).searchParams.get("sprintId"));
    if (!sprintId) return NextResponse.json({ error: "sprintId required" }, { status: 400 });

    // Fetch sprint basics
    const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (!sprint || !sprint.startDate || !sprint.endDate) {
        return NextResponse.json({
            sprint: sprint ?? null,
            series: [],
            total: 0,
            message: "Sprint has no start/end dates — set them to see the burn-down chart.",
        });
    }

    type BurnRow = { day: Date; remaining: bigint; done: bigint; total: bigint };

    const rows = await prisma.$queryRaw<BurnRow[]>`
        WITH
        total AS (
            SELECT COUNT(*)::int AS n
            FROM   "Task"
            WHERE  "sprintId" = ${sprintId}
              AND  "deletedAt" IS NULL
        ),
        completions AS (
            SELECT DATE("updatedAt") AS day, COUNT(*)::int AS cnt
            FROM   "Task"
            WHERE  "sprintId" = ${sprintId}
              AND  status = 'DONE'
              AND  "deletedAt" IS NULL
            GROUP  BY DATE("updatedAt")
        ),
        days AS (
            SELECT generate_series(
                ${sprint.startDate}::date,
                LEAST(${sprint.endDate}::date, CURRENT_DATE),
                '1 day'
            )::date AS day
        ),
        filled AS (
            SELECT d.day, COALESCE(c.cnt, 0) AS cnt
            FROM   days d
            LEFT   JOIN completions c ON c.day = d.day
        ),
        running AS (
            SELECT
                day,
                SUM(cnt) OVER (ORDER BY day)::int AS done_so_far
            FROM filled
        )
        SELECT
            r.day,
            (t.n - r.done_so_far) AS remaining,
            r.done_so_far         AS done,
            t.n                   AS total
        FROM running r, total t
        ORDER BY r.day
    `;

    const totalTasks = rows.length > 0 ? Number(rows[0].total) : 0;
    const dayCount = rows.length;

    const series = rows.map((r, i) => ({
        day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
        remaining: Number(r.remaining),
        done: Number(r.done),
        total: Number(r.total),
        // Ideal burn-down: linear from total → 0 over sprint duration
        ideal: Math.round(totalTasks * (1 - i / Math.max(dayCount - 1, 1))),
    }));

    return NextResponse.json({
        sprint: { id: sprint.id, name: sprint.name },
        series,
        total: totalTasks,
    });
}
