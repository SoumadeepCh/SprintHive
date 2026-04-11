export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
        return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    // Verify project belongs to user's org
    const project = await prisma.project.findUnique({
        where: { id: Number(projectId) },
        select: { organizationId: true },
    });
    if (!project || !orgIds.includes(project.organizationId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [summary] = await prisma.$queryRaw<
        {
            total_tasks: bigint;
            completed_tasks: bigint;
            total_sprints: bigint;
            active_sprint_name: string | null;
            high_priority_open: bigint;
            avg_tasks_per_sprint: number | null;
        }[]
    >(
        Prisma.sql`
        WITH sprint_stats AS (
            SELECT
                COUNT(*)                           AS total_sprints,
                MAX(CASE WHEN "isActive" THEN name END) AS active_sprint_name,
                AVG(task_cnt)                      AS avg_tasks_per_sprint
            FROM (
                SELECT s.id, s.name, s."isActive",
                       COUNT(t.id) AS task_cnt
                FROM "Sprint" s
                LEFT JOIN "Task" t
                    ON t."sprintId" = s.id AND t."deletedAt" IS NULL
                WHERE s."projectId" = ${Number(projectId)}
                GROUP BY s.id, s.name, s."isActive"
            ) sub
        ),
        task_stats AS (
            SELECT
                COUNT(t.id)                                          AS total_tasks,
                COUNT(t.id) FILTER (WHERE t.status = 'DONE')        AS completed_tasks,
                COUNT(t.id) FILTER (
                    WHERE t.priority IN ('HIGH','URGENT')
                    AND   t.status  != 'DONE'
                )                                                    AS high_priority_open
            FROM "Task" t
            WHERE t."projectId" = ${Number(projectId)}
              AND t."deletedAt" IS NULL
        )
        SELECT
            ts.total_tasks,
            ts.completed_tasks,
            ss.total_sprints,
            ss.active_sprint_name,
            ts.high_priority_open,
            ss.avg_tasks_per_sprint
        FROM task_stats ts, sprint_stats ss
        `
    );

    if (!summary) {
        return NextResponse.json({
            totalTasks: 0, completedTasks: 0, completionRate: 0,
            totalSprints: 0, activeSprintName: null,
            highPriorityOpen: 0, avgTasksPerSprint: 0,
        });
    }

    const totalTasks = Number(summary.total_tasks);
    const completedTasks = Number(summary.completed_tasks);

    return NextResponse.json({
        totalTasks,
        completedTasks,
        completionRate: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
        totalSprints: Number(summary.total_sprints),
        activeSprintName: summary.active_sprint_name,
        highPriorityOpen: Number(summary.high_priority_open),
        avgTasksPerSprint: summary.avg_tasks_per_sprint
            ? Math.round(Number(summary.avg_tasks_per_sprint) * 10) / 10
            : 0,
    });
}
