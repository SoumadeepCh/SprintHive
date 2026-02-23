export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET: orgs the current user belongs to
export async function GET() {
    const user = await getOrCreateDbUser();
    const orgIds = await getUserOrgIds(user.id);

    const orgs = await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { memberships: true, projects: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orgs);
}

// POST: create org — owner is the authenticated user
export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const { name } = await req.json();

    if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const org = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
            data: { name, ownerId: user.id },
        });
        // Add owner as a member with OWNER role
        await tx.userOrganization.create({
            data: { userId: user.id, organizationId: org.id, role: "OWNER" },
        });
        return org;
    });

    return NextResponse.json(org, { status: 201 });
}
