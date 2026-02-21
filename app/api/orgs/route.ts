import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all orgs (with owner + member count)
export async function GET() {
    const orgs = await prisma.organization.findMany({
        include: {
            owner: { select: { id: true, name: true, email: true } },
            _count: { select: { members: true, projects: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orgs);
}

// POST create org (also creates the owner user if needed)
export async function POST(req: NextRequest) {
    const { name, ownerName, ownerEmail } = await req.json();
    if (!name || !ownerName || !ownerEmail) {
        return NextResponse.json({ error: "name, ownerName, ownerEmail required" }, { status: 400 });
    }
    // Upsert user then create org
    const org = await prisma.$transaction(async (tx) => {
        const owner = await tx.user.upsert({
            where: { email: ownerEmail },
            update: {},
            create: { name: ownerName, email: ownerEmail },
        });
        const org = await tx.organization.create({
            data: { name, ownerId: owner.id },
        });
        // Link owner as member too
        await tx.user.update({
            where: { id: owner.id },
            data: { organizationId: org.id },
        });
        return org;
    });
    return NextResponse.json(org, { status: 201 });
}
