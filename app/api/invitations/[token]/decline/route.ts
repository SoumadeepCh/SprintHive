export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST: decline an invitation — requires logged-in user
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    await getOrCreateDbUser(); // ensure authenticated
    const { token } = await params;

    const invitation = await prisma.orgInvitation.findUnique({
        where: { token },
    });

    if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
        return NextResponse.json(
            { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
            { status: 400 }
        );
    }

    await prisma.orgInvitation.update({
        where: { id: invitation.id },
        data: { status: "DECLINED" },
    });

    return NextResponse.json({ success: true });
}
