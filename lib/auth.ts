import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Resolves the current Clerk session to a database User.
 * - If the user doesn't exist in DB yet, creates one using Clerk profile data.
 * - Returns the DB user record.
 * - Throws a Response-like object with 401 if not authenticated.
 */
export async function getOrCreateDbUser() {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    // Check if user exists in DB by clerkId
    let dbUser = await prisma.user.findUnique({
        where: { clerkId },
    });

    if (!dbUser) {
        // Pull profile from Clerk
        const clerkUser = await currentUser();
        const email =
            clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@clerk.user`;
        const name =
            [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
            "User";

        // Upsert: handle race condition where another request may have created the user
        dbUser = await prisma.user.upsert({
            where: { clerkId },
            update: {},
            create: { clerkId, name, email },
        });
    }

    return dbUser;
}

/**
 * Returns the list of organization IDs the user belongs to (as owner or member).
 */
export async function getUserOrgIds(userId: number): Promise<number[]> {
    const memberships = await prisma.userOrganization.findMany({
        where: { userId },
        select: { organizationId: true },
    });
    return memberships.map((m) => m.organizationId);
}
