export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
	const users = await prisma.user.findMany({
		include: { organization: true },
	});

	return NextResponse.json(users);
}

export async function POST() {
	const user = await prisma.user.create({
		data: {
			name: "Ainz",
			email: `ainz${Date.now()}@mail.com`,
			organization: {
				connect: { id: 1 },
			},
		},
		include: { organization: true },
	});

	return NextResponse.json(user);
}
