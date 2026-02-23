export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/workload?orgId=
 *
 * Per-user workload breakdown by task status for an org.
 * Uses the UserOrganization join table for membership lookup.
 */
export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const userOrgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
        return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    if (!userOrgIds.includes(Number(orgId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        INNER JOIN "UserOrganization" uo
            ON uo."userId" = u.id
            AND uo."organizationId" = ${Number(orgId)}
        LEFT JOIN "Task" t
            ON t."assigneeId" = u.id
            AND t."deletedAt" IS NULL
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
