export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const projects = await prisma.project.findMany({
        where: orgId ? { organizationId: Number(orgId) } : {},
        include: {
            organization: { select: { id: true, name: true } },
            _count: { select: { sprints: true, labels: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
    const { name, description, organizationId } = await req.json();
    if (!name || !organizationId) {
        return NextResponse.json({ error: "name and organizationId required" }, { status: 400 });
    }
    const project = await prisma.project.create({
        data: { name, description, organizationId: Number(organizationId) },
    });
    return NextResponse.json(project, { status: 201 });
}
