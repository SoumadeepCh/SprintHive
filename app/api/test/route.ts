import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
	const users = await prisma.user.findMany({
		include: { projects: true },
	});

	return NextResponse.json(users);
}

export async function POST() {
	const user = await prisma.user.create({
		data: {
			name: "Ainz",
			email: `ainz${Date.now()}@mail.com`,
			projects: {
				create: { name: "Demo Project" },
			},
		},
		include: { projects: true },
	});

	return NextResponse.json(user);
}
