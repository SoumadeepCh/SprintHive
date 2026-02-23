import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await req.json();
    const todo = await prisma.task.update({
        where: { id: Number(id) },
        data: {
            ...(typeof body.completed === "boolean" && { completed: body.completed }),
            ...(typeof body.title === "string" && { title: body.title.trim() }),
        },
    });
    return NextResponse.json(todo);
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    await prisma.task.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
