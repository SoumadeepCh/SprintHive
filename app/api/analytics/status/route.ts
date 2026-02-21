import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/analytics/status?sprintId=
 *
 * Uses Prisma's groupBy() to aggregate task counts by status.
 * This is the idiomatic Prisma way for simple single-table aggregations.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const sprintId = searchParams.get("sprintId");

    if (!sprintId) {
        return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
    }

    // Prisma groupBy: aggregate task count per status value.
    // Returns [{ status: "TODO", _count: { id: 5 } }, ...]
    const groups = await prisma.task.groupBy({
        by: ["status"],
        where: {
            sprintId: Number(sprintId),
            deletedAt: null,
        },
        _count: {
            id: true,
        },
        orderBy: {
            status: "asc",
        },
    });

    const data = groups.map((g) => ({
        status: g.status,
        count: g._count.id,
    }));

    return NextResponse.json(data);
}
