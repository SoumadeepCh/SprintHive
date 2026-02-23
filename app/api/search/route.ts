export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search?q=<query>
 *
 * Full-text search scoped to the authenticated user's organizations.
 */
export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

    if (q.length < 2 || orgIds.length === 0) {
        return NextResponse.json({ tasks: [], projects: [], sprints: [], query: q });
    }

    const ilike = `%${q}%`;

    // Build an SQL-safe list of org IDs for the IN clause
    const orgIdList = orgIds.join(",");

    const [tasks, projects, sprints] = await Promise.all([
        // ── Tasks: FTS on title + description, scoped to user's orgs ──
        prisma.$queryRawUnsafe<{
            id: number; title: string; description: string | null;
            status: string; priority: string; sprint_id: number; sprint_name: string;
            rank: number;
        }[]>(`
            SELECT
                t.id,
                t.title,
                t.description,
                t.status::text,
                t.priority::text,
                t."sprintId"   AS sprint_id,
                s.name         AS sprint_name,
                ts_rank(
                    to_tsvector('english', t.title || ' ' || COALESCE(t.description, '')),
                    plainto_tsquery('english', $1)
                )              AS rank
            FROM   "Task"   t
            JOIN   "Sprint" s ON s.id = t."sprintId"
            JOIN   "Project" p ON p.id = s."projectId"
            WHERE  t."deletedAt" IS NULL
              AND  p."organizationId" IN (${orgIdList})
              AND (
                    to_tsvector('english', t.title || ' ' || COALESCE(t.description, ''))
                        @@ plainto_tsquery('english', $1)
                 OR t.title       ILIKE $2
                 OR t.description ILIKE $2
              )
            ORDER  BY rank DESC
            LIMIT  20
        `, q, ilike),

        // ── Projects: scoped to user's orgs ──
        prisma.$queryRawUnsafe<{
            id: number; name: string; description: string | null;
            sprint_count: number;
        }[]>(`
            SELECT
                p.id,
                p.name,
                p.description,
                COUNT(s.id)::int AS sprint_count
            FROM   "Project" p
            LEFT   JOIN "Sprint" s ON s."projectId" = p.id
            WHERE  p."organizationId" IN (${orgIdList})
              AND (p.name ILIKE $1 OR p.description ILIKE $1)
            GROUP  BY p.id, p.name, p.description
            LIMIT  10
        `, ilike),

        // ── Sprints: scoped to user's orgs ──
        prisma.$queryRawUnsafe<{
            id: number; name: string; project_id: number; project_name: string;
            is_active: boolean; task_count: number;
        }[]>(`
            SELECT
                sp.id,
                sp.name,
                sp."projectId"   AS project_id,
                pr.name          AS project_name,
                sp."isActive"    AS is_active,
                COUNT(t.id)::int AS task_count
            FROM   "Sprint"  sp
            JOIN   "Project" pr ON pr.id = sp."projectId"
            LEFT   JOIN "Task" t ON t."sprintId" = sp.id AND t."deletedAt" IS NULL
            WHERE  pr."organizationId" IN (${orgIdList})
              AND  sp.name ILIKE $1
            GROUP  BY sp.id, sp.name, sp."projectId", pr.name, sp."isActive"
            LIMIT  10
        `, ilike),
    ]);

    return NextResponse.json({
        query: q,
        tasks: tasks.map(t => ({ ...t, rank: Number(t.rank) })),
        projects: projects.map(p => ({ ...p, sprint_count: Number(p.sprint_count ?? 0) })),
        sprints: sprints.map(s => ({ ...s, task_count: Number(s.task_count ?? 0) })),
    });
}
