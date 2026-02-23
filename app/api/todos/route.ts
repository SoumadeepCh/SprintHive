export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { prisma } from "@/lib/prisma";
import { getOrCreateDbUser, getUserOrgIds } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const user = await getOrCreateDbUser();
  const orgIds = await getUserOrgIds(user.id);

  const todos = await prisma.task.findMany({
    where: { sprint: { project: { organizationId: { in: orgIds } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(todos);
}

export async function POST(req: NextRequest) {
  const user = await getOrCreateDbUser();
  const { title, sprintId } = await req.json();

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!sprintId) {
    return NextResponse.json({ error: "sprintId is required" }, { status: 400 });
  }

  const todo = await prisma.task.create({
    data: { title: title.trim(), sprintId: Number(sprintId), creatorId: user.id },
  });
  return NextResponse.json(todo, { status: 201 });
}
