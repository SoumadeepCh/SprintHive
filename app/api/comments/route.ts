import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { content, taskId, userId } = await req.json();
    if (!content || !taskId || !userId) {
        return NextResponse.json({ error: "content, taskId, userId required" }, { status: 400 });
    }
    const comment = await prisma.comment.create({
        data: { content, taskId: Number(taskId), userId: Number(userId) },
        include: { user: { select: { id: true, name: true } } },
    });
    return NextResponse.json(comment, { status: 201 });
}
