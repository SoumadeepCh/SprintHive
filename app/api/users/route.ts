import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const users = await prisma.user.findMany({
        where: orgId ? { organizationId: Number(orgId) } : {},
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
    const { name, email, organizationId } = await req.json();
    if (!name || !email) {
        return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }
    const user = await prisma.user.upsert({
        where: { email },
        update: { name, ...(organizationId && { organizationId: Number(organizationId) }) },
        create: { name, email, ...(organizationId && { organizationId: Number(organizationId) }) },
    });
    return NextResponse.json(user, { status: 201 });
}
