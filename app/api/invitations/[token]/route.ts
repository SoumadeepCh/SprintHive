export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET: fetch invitation details by token (public)
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const invitation = await prisma.orgInvitation.findUnique({
        where: { token },
        include: {
            organization: { select: { id: true, name: true } },
            inviter: { select: { id: true, name: true } },
        },
    });

    if (!invitation) {
        return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    return NextResponse.json({
        id: invitation.id,
        token: invitation.token,
        email: invitation.email,
        status: invitation.status,
        organization: invitation.organization,
        inviter: invitation.inviter,
        createdAt: invitation.createdAt,
    });
}
