export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const sprintId = Number(new URL(req.url).searchParams.get("sprintId"));
    if (!sprintId) return NextResponse.json({ error: "sprintId required" }, { status: 400 });

    // Verify sprint belongs to user's org
    const sprint = await prisma.sprint.findUnique({
        where: { id: sprintId },
        select: { id: true, name: true, startDate: true, endDate: true, project: { select: { organizationId: true } } },
    });

    if (!sprint || !orgIds.includes(sprint.project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!sprint.startDate || !sprint.endDate) {
        return NextResponse.json({
            sprint: { id: sprint.id, name: sprint.name },
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
        ideal: Math.round(totalTasks * (1 - i / Math.max(dayCount - 1, 1))),
    }));

    return NextResponse.json({
        sprint: { id: sprint.id, name: sprint.name },
        series,
        total: totalTasks,
    });
}
