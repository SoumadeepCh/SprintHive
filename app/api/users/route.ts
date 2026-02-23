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

    // Return users who are members of the same orgs as the current user
    const memberships = await prisma.userOrganization.findMany({
        where: {
            organizationId: orgId
                ? { in: orgIds.includes(Number(orgId)) ? [Number(orgId)] : [] }
                : { in: orgIds },
        },
        include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Deduplicate users (a user can be in multiple orgs)
    const userMap = new Map<number, { id: number; name: string; email: string }>();
    for (const m of memberships) {
        userMap.set(m.user.id, m.user);
    }

    return NextResponse.json([...userMap.values()].sort((a, b) => a.name.localeCompare(b.name)));
}

export async function POST(req: NextRequest) {
    const user = await getOrCreateDbUser();
    const { name, email, organizationId } = await req.json();
    if (!name || !email) {
        return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }

    // If adding to an org, verify current user has access
    if (organizationId) {
        const orgIds = await getUserOrgIds(user.id);
        if (!orgIds.includes(Number(organizationId))) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
    }

    const newUser = await prisma.user.upsert({
        where: { email },
        update: { name },
        create: { name, email },
    });

    // Add to org if specified
    if (organizationId) {
        await prisma.userOrganization.upsert({
            where: {
                userId_organizationId: {
                    userId: newUser.id,
                    organizationId: Number(organizationId),
                },
            },
            update: {},
            create: {
                userId: newUser.id,
                organizationId: Number(organizationId),
                role: "MEMBER",
            },
        });
    }

    return NextResponse.json(newUser, { status: 201 });
}
