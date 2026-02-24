export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST: accept an invitation — requires logged-in user
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const user = await getOrCreateDbUser();
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

    // Accept: create membership + mark invitation as ACCEPTED
    await prisma.$transaction(async (tx) => {
        await tx.orgInvitation.update({
            where: { id: invitation.id },
            data: { status: "ACCEPTED" },
        });

        await tx.userOrganization.upsert({
            where: {
                userId_organizationId: {
                    userId: user.id,
                    organizationId: invitation.organizationId,
                },
            },
            update: {},
            create: {
                userId: user.id,
                organizationId: invitation.organizationId,
                role: "MEMBER",
            },
        });
    });

    return NextResponse.json({
        success: true,
        organizationId: invitation.organizationId,
    });
}
