import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    const labels = await prisma.label.findMany({
        where: { projectId: Number(projectId) },
        orderBy: { name: "asc" },
    });
    return NextResponse.json(labels);
}

export async function POST(req: NextRequest) {
    const { name, color, projectId } = await req.json();
    if (!name || !projectId) {
        return NextResponse.json({ error: "name and projectId required" }, { status: 400 });
    }
    const label = await prisma.label.create({
        data: { name, color: color || "#6b7280", projectId: Number(projectId) },
    });
    return NextResponse.json(label, { status: 201 });
}
