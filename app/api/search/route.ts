import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/search?q=<query>
 *
 * Full-text search across Tasks, Projects, and Sprints.
 *
 * Strategy:
 *   Primary:  PostgreSQL tsvector + plainto_tsquery (proper FTS with stemming/ranking)
 *   Fallback: ILIKE '%query%' for short/single-char queries and partial matches
 *   Combined: OR of both so neither misses results
 *
 * Returns results grouped by type: { tasks, projects, sprints }
 */
export async function GET(req: NextRequest) {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
        return NextResponse.json({ tasks: [], projects: [], sprints: [], query: q });
    }

    const ilike = `%${q}%`;

    // Run all three searches in parallel
    const [tasks, projects, sprints] = await Promise.all([
        // ── Tasks: FTS on title + description ───────────────────────────────
        prisma.$queryRaw<{
            id: number; title: string; description: string | null;
            status: string; priority: string; sprint_id: number; sprint_name: string;
            rank: number;
        }[]>`
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
                    plainto_tsquery('english', ${q})
                )              AS rank
            FROM   "Task"   t
            JOIN   "Sprint" s ON s.id = t."sprintId"
            WHERE  t."deletedAt" IS NULL
              AND (
                    to_tsvector('english', t.title || ' ' || COALESCE(t.description, ''))
                        @@ plainto_tsquery('english', ${q})
                 OR t.title       ILIKE ${ilike}
                 OR t.description ILIKE ${ilike}
              )
            ORDER  BY rank DESC
            LIMIT  20
        `,

        // ── Projects: name + description ─────────────────────────────────────
        prisma.$queryRaw<{
            id: number; name: string; description: string | null;
            sprint_count: number;
        }[]>`
            SELECT
                p.id,
                p.name,
                p.description,
                COUNT(s.id)::int AS sprint_count
            FROM   "Project" p
            LEFT   JOIN "Sprint" s ON s."projectId" = p.id
            WHERE  p.name        ILIKE ${ilike}
               OR  p.description ILIKE ${ilike}
            GROUP  BY p.id, p.name, p.description
            LIMIT  10
        `,

        // ── Sprints: name ─────────────────────────────────────────────────────
        prisma.$queryRaw<{
            id: number; name: string; project_id: number; project_name: string;
            is_active: boolean; task_count: number;
        }[]>`
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
            WHERE  sp.name ILIKE ${ilike}
            GROUP  BY sp.id, sp.name, sp."projectId", pr.name, sp."isActive"
            LIMIT  10
        `,
    ]);

    return NextResponse.json({
        query: q,
        tasks: tasks.map(t => ({ ...t, rank: Number(t.rank) })),
        projects: projects.map(p => ({ ...p, sprint_count: Number(p.sprint_count ?? 0) })),
        sprints: sprints.map(s => ({ ...s, task_count: Number(s.task_count ?? 0) })),
    });
}
