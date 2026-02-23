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
