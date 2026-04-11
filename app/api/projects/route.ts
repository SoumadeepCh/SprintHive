export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    const projects = await prisma.project.findMany({
        where: {
            organizationId: orgId
                ? { in: orgIds.includes(Number(orgId)) ? [Number(orgId)] : [] }
                : { in: orgIds },
        },
        include: {
            organization: { select: { id: true, name: true } },
            _count: { select: { sprints: true, labels: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);
    const { name, description, organizationId } = await req.json();

    if (!name || !organizationId) {
        return NextResponse.json({ error: "name and organizationId required" }, { status: 400 });
    }
    if (!orgIds.includes(Number(organizationId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const baseKey = String(name).replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PRJ";
    const projectCount = await prisma.project.count({ where: { organizationId: Number(organizationId) } });

    const project = await prisma.project.create({
        data: { name, key: `${baseKey}${projectCount + 1}`, description, organizationId: Number(organizationId) },
    });
    return NextResponse.json(project, { status: 201 });
}
